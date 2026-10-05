## Rules conventions

- Tailwind only. No CSS modules or styled-components.
- Prefer server functions (`createServerFn`) for data & mutations.
- Database access only through Prisma.
- Client pages: large imagery, restrained text, subtle booking CTA, lots of whitespace.
- Admin pages: clear sidebar, metric cards, simple charts.
- Never invent schema fields, env vars, or business rules — ask if unclear.
- Do not commit secrets or `.env*`.
- Make the smallest change that solves the task.
