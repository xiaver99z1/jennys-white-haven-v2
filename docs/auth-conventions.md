# Auth conventions

We use **Better Auth** for authentication.

## Admin Auth (Current Priority)

- Login page: `/admin/login` (full page, **no sidebar**)
- Method: Email + Password only
- After successful login → redirect to `/admin` using `window.location.replace()`
- Logout → `window.location.replace("/admin/login")`
- All `/admin/*` routes (except login) are protected
- Roles (future): `owner` | `admin` | `staff`

### Protection Rules

- Server-side check in `beforeLoad`
- No-cache headers on admin routes
- BFCache protection (`pageshow` event)
- Client-side session re-check in AdminLayout
- Never allow access to protected pages via browser Back button after logout

### Technical

- Better Auth + Prisma adapter
- Handler: `/api/auth/$`
- Must use `tanstackStartCookies()` plugin (last plugin)
- Auth client: `src/lib/auth-client.ts`
- Server auth: `src/lib/auth.ts`

## Client Auth (Later)

- Airbnb-style modal
- Email + Google + Apple
- Will be implemented after admin side is stable
