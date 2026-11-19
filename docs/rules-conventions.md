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
- Never store hardcoded admin passwords or seeders in code; first-time Super Admin provisioning happens exclusively through `/admin/setup`.
- Client pages: large imagery, restrained text, subtle booking CTA, generous whitespace.
- Admin pages: clear sidebar, metric cards, simple charts, low visual noise.

## Reuse & code organization

- **Types:** Import and define shared domain, entity, and router types in `#/types` (`src/types/index.ts`). Do not duplicate interfaces across components.
- **Formatters:** Use `#/lib/formatters` (`formatPeso`, `formatDate`, `formatDateInput`, `formatLocalDate`, `formatShortDate`, `formatFullName`, `getBookingStatusMeta`, `getPaymentStatusMeta`, `getRoomStatusMeta`, `getRoleBadgeClass`, `getErrorMessage`). Do not inline currency or date formatting in UI components.
- **Constants & Labels:** Put reusable UI strings and badge metadata in `#/lib/constants/labels.ts` (`ADMIN_LABELS`, `*_STATUS_META`), and domain option lists in `#/lib/constants/rooms.ts`.
- **Common Components:** Reuse `#/components/common/` (`StatusBadge`, `EmptyState`, `StatCard`, `Panel`, `ConfirmModal`, `AdminDataTable`) instead of duplicating badge, card, modal, or empty-state markup.
- **Verification:** Before finishing changes, pass `pnpm exec tsc --noEmit`, `pnpm lint` (0 errors/warnings), and `pnpm coverage` (100% coverage on `src/components/**` and `src/server/**`).

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
   - `Business -> BusinessMedia -> Media` (CMS / site media)
7. **Database transactions:** Always use database transactions (`prisma.$transaction`) when creating or updating media relationships.
8. **Safe deletion & cleanup:** Delete R2 files when media records are permanently deleted, but **never delete the actual R2 file before confirming the database operation**. Mark/queue deletions and use a cleanup process or background job to handle failed R2 deletions.
