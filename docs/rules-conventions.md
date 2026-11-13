# Rules conventions

- Make the smallest change that solves the task.
- Never invent schema fields, env vars, API shapes, or business rules — ask if unclear.
- Do not commit secrets or `.env*` files.
- Prefer existing patterns in the codebase over introducing new ones.
- Database access only through Prisma.
- Authentication is handled only by Better Auth.
- Prefer server functions (`createServerFn`) for data and mutations.

## Admin specific

- `/admin/login` must never show the sidebar.
- After login/logout always use `window.location.replace()` (not `navigate`).
- Protect all `/admin/*` routes (except login).
- Client pages: large imagery, restrained text, subtle booking CTA, generous whitespace.
- Admin pages: clear sidebar, metric cards, simple charts, low visual noise.

## Reuse & code organization

- **Types:** Import and define shared domain, entity, and router types in `#/types` (`src/types/index.ts`). Do not duplicate interfaces across components.
- **Formatters:** Use `#/lib/formatters` (`formatPeso`, `formatDate`, `formatDateInput`, `formatLocalDate`, `formatShortDate`, `formatFullName`, `getBookingStatusMeta`, `getPaymentStatusMeta`, `getRoomStatusMeta`, `getRoleBadgeClass`, `getErrorMessage`). Do not inline currency or date formatting in UI components.
- **Constants & Labels:** Put reusable UI strings and badge metadata in `#/lib/constants/labels.ts` (`ADMIN_LABELS`, `*_STATUS_META`), and domain option lists in `#/lib/constants/rooms.ts`.
- **Common Components:** Reuse `#/components/common/` (`StatusBadge`, `EmptyState`, `StatCard`, `Panel`, `ConfirmModal`, `AdminDataTable`) instead of duplicating badge, card, modal, or empty-state markup.
- **Verification:** Before finishing changes, pass `pnpm exec tsc --noEmit`, `pnpm lint` (0 errors/warnings), and `pnpm coverage` (100% coverage on `src/components/**` and `src/server/**`).
