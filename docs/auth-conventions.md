# Auth conventions

We use **Better Auth** for authentication and role-based access control (`src/lib/permissions.ts`, `src/lib/require-permission.ts`).

## Admin Auth

- Initial setup page: `/admin/setup` (full page, **no sidebar**)
  - When **0 users** exist in the database, visiting `/admin`, `/admin/login`, or any `/admin/*` route automatically redirects to `/admin/setup`.
  - Allows creating the first `super_admin` account (Name, Email, Password) via a serializable transaction (`src/server/setup-actions.ts`)—no database seeder or hardcoded credentials in code.
  - Requires **email verification** before sign-in: generates a 256-bit random token, stores only its SHA-256 hash (`activationToken`) with a 1-hour expiry, sends a verification link via Nodemailer SMTP (`src/lib/email.ts`, configured with `SMTP_USER` and `SMTP_PASS` such as a Gmail App Password so emails can be delivered to any recipient email address without requiring a custom domain), and rolls back the unverified account if initial email delivery fails.
  - Activation page (`/verify-activation`) sets `Referrer-Policy: no-referrer`, strips `?token=` from browser history on load, requires an explicit button click (`POST`) to prevent email-scanner prefetch consumption, and atomically verifies the account once.
  - Rate-limited, anti-enumeration resend (`resendVerificationByEmail`: 5-minute cooldown, max 3/24h, token rotation) is available on both `/admin/setup` (post-registration) and `/admin/login` (when unverified).
  - Once at least 1 user exists, `/admin/setup` is permanently locked and redirects to `/admin` (authenticated) or `/admin/login` (unauthenticated).
- Login page: `/admin/login` (full page, **no sidebar**)
- Method: Email + Password only (all password fields across `/admin/login`, `/admin/setup`, `/reset-password`, `/admin/profile`, staff edit modals, and step-up password prompts use the shared `<PasswordInput>` / `<PasswordField>` eye-icon visibility toggle, resetting to hidden on close/cancel)
- After successful login or initial setup → redirect to `/admin` using `window.location.replace()`
- Logout → `window.location.replace("/admin/login")`
- All `/admin/*` routes (except `/admin/login` and `/admin/setup`) are protected

## Roles & Permissions

- Roles: `super_admin` | `owner` | `manager` | `receptionist`
- Permission matrix (`src/lib/permissions.ts`):
  - `super_admin` & `owner`: full permissions across rooms, bookings, guests, users, reports (`view:reports`), CMS & review moderation (`manage:cms`), and live chat support (`manage:chat`).
  - `manager`: view/create/update rooms, bookings, and guests; view users and reports; `manage:cms`; `manage:chat`.
  - `receptionist`: view rooms; view/create bookings and guests; `manage:chat` (live chat inbox & visitor presence).
- Server actions enforce permissions through `requirePermission(permission)` (`src/lib/require-permission.ts`), preventing unprivileged or self-registered accounts without a staff role from accessing admin data or chat transcripts.

## Step-Up Re-Authentication & Password Recovery

- Step-up re-authentication for staff password changes:
  - Changing another user's password in User Management (`EditUserProfileModal` -> `updateAdminUser`) opens `PasswordChallengeModal` (`role="dialog"`, `aria-modal="true"`, focus containment and restoration) and verifies the logged-in admin's credential password on the server (`verifyPassword` from `better-auth/crypto`).
  - Failed administrator password checks are tracked in `Verification` (`admin-reauth-fail:<userId>`) and rate-limited to 5 failed attempts per 15-minute window, resetting on successful verification.
- Forgot password from Profile (`/admin/profile` -> `/reset-password`):
  - Clicking **Forgot password?** in Account Settings sends a 30-minute one-time reset link (SHA-256 hashed token atomically stored/rotated in `Verification` with identifier `password-reset:<userId>`, 5-minute cooldown and max 3/24h quota tracked via `password-reset-quota:<userId>`, enforced on both server and client UI countdown) via Nodemailer SMTP.
  - `/reset-password` strips `?token=` from browser history, validates password complexity, atomically consumes the token, updates the credential password, and revokes active sessions.

### Protection Rules

- Server-side check in `beforeLoad`
- No-cache headers on admin routes
- BFCache protection (`pageshow` event)
- Client-side session re-check in `AdminLayout`
- Never allow access to protected pages via browser Back button after logout

### Technical

- Better Auth + Prisma adapter
- Handler: `/api/auth/$`
- Must use `tanstackStartCookies()` plugin (last plugin)
- Auth client: `src/lib/auth-client.ts`
- Server auth: `src/lib/auth.ts`

## Public Visitor Inquiries & Bookings

- Public room reservations (`/rooms/$id`), booking lookups (`/booking-status`), and live chat support (`PublicChatWidget`) do not require guest account sign-up:
  - Booking lookups and verified post-stay review submissions authenticate against the reservation's `bookingReference` + matching guest email or phone digits.
  - Visitor live chat sessions use a 256-bit random `visitorToken` stored in `localStorage` (`jwh_chat_visitor_token`), with only its SHA-256 `visitorTokenHash` persisted in PostgreSQL alongside transactional per-visitor and per-IP rate limiting.
