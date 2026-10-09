# Structure conventions

- `src/routes/` — file-based routes (TanStack Router)
- `src/routes/admin/` — Admin section
  - `login.tsx` → Login page (no sidebar)
  - `route.tsx` → Protected layout + sidebar
  - `index.tsx` → Dashboard
- `src/lib/auth.ts` — Better Auth server instance
- `src/lib/auth-client.ts` — Better Auth client
- `src/lib/prisma.ts` — Prisma client
- `src/components/` — reusable UI components
- `prisma/` — Prisma schema and migrations
- `docs/` — agent conventions and design references
- `public/` — static assets
