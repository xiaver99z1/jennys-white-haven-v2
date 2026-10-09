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
