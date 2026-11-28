# Rules conventions

- Make the smallest change that solves the task.
- Never invent schema fields, env vars, API shapes, or business rules — ask if unclear.
- Do not commit secrets or `.env*` files.
- Prefer existing patterns in the codebase over introducing new ones.
- Database access only through Prisma.
- Authentication is handled only by Better Auth.
- Prefer server functions (`createServerFn`) for data and mutations.

## Admin specific

- `/admin/login` and `/admin/setup` must never show the sidebar.
- After login, initial setup, or logout always use `window.location.replace()` (not `navigate`).
- Protect all `/admin/*` routes (except `/admin/login`, and `/admin/setup` only when 0 users exist).
- Enforce server-side RBAC permissions via `requirePermission(permission)` from `#/lib/require-permission` (never cross-import permission guards from unrelated `src/server/*-actions.ts` files).
- Never store hardcoded admin passwords or seeders in code; first-time Super Admin provisioning happens exclusively through `/admin/setup`.
- Client pages: large imagery, restrained text, subtle booking CTA, generous whitespace.
- Admin pages: clear sidebar, metric cards, simple charts, low visual noise.

## Reuse & code organization

- **Types:** Import and define shared domain, entity, and router types in `#/types` (`src/types/index.ts`). Do not duplicate interfaces across components.
- **Formatters & Currency:**
  - Use `#/lib/formatters` (`formatPeso`, `formatDate`, `formatDateInput`, `formatLocalDate`, `parseLocalIsoDate`, `computeStayNights`, `formatShortDate`, `formatLocalDateOnly`, `formatLocalDateTime`, `formatChatTime`, `formatUtcTimestamp`, `formatCalendarDayHeader`, `formatFullName`, `getBookingStatusMeta`, `getPaymentStatusMeta`, `getRoomStatusMeta`, `getReviewStatusMeta`, `getChatStatusMeta`, `getRoleBadgeClass`, `getErrorMessage`). Do not inline `.toLocaleString()`, `.toLocaleDateString()`, or `.toLocaleTimeString()` in UI components or server handlers.
  - On **public guest pages**, format room rates, extra-person fees, and booking totals with `useCurrency().formatPrice(phpAmount)` from `#/lib/currency` (while noting PHP as the billing currency when converted). On **admin pages, logs, and database writes**, always use `formatPeso` and raw PHP amounts.
- **Constants & Labels:** Put domain constants in `#/lib/constants/`:
  - `auth.ts` — auth/security constants and password validators
  - `chat.ts` — live-chat timing, pagination, rate-limit, and quick-reply presets
  - `cms.ts` — CMS section defaults, brand logos, hero config, and tourist spot serializers
  - `currencies.ts` — supported currencies, fallback rates, and storage keys
  - `labels.ts` — `ADMIN_LABELS`, `REVIEW_RATING_LABELS`, and `*_STATUS_META` badge maps
  - `rooms.ts` — room/booking/amenity/blocked-date presets, extra-guest fee helpers, and `buildOccupiedBookedRanges`
- **Common Components:** Reuse `#/components/common/` (`StatusBadge`, `EmptyState`, `StatCard`, `Panel`, `ConfirmModal`, `PasswordChallengeModal`, `PasswordInput`, `ExtraGuestsCounterField`, `AdminDataTable`) and `#/components/admin/auth/AuthPageShell` (`AuthPageShell`, `PasswordField`) instead of duplicating badge, password eye-toggle, stepper, card, modal, auth shell, or empty-state markup.
- **Verification:** Before finishing changes, pass `pnpm exec tsc --noEmit`, `pnpm lint` (0 errors/warnings), unit tests (`pnpm vitest run`), and `pnpm build`.

## Media & File Storage (Cloudflare R2)

1. **Object keys only:** Store only object keys in PostgreSQL, never image binary data or Base64 data URLs.
2. **Cloudflare R2:** Use Cloudflare R2 for actual file storage and **Presigned URLs** for uploads.
3. **Public CDN URLs:** Use Cloudflare CDN URLs (`WebP` / `AVIF` optimized) for public room and website photos.
4. **Private storage:** Keep booking receipts and private documents in private storage (accessed only via signed URLs).
5. **Thumbnails:** Generate/serve thumbnails for room listing pages.
6. **Explicit relational tables:** Model media with explicit foreign keys:
   - `User -> Media` (profile image)
   - `Room -> RoomMedia -> Media`
   - `Booking -> BookingMedia -> Media`
   - `SiteSection -> BusinessMedia -> Media` (CMS / site media)
7. **Database transactions:** Always use database transactions (`prisma.$transaction`) when creating or updating media relationships.
8. **Safe deletion & cleanup:** Delete R2 files when media records are permanently deleted, but **never delete the actual R2 file before confirming the database operation**. Mark/queue deletions and use a cleanup process or background job to handle failed R2 deletions.
