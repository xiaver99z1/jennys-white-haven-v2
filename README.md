# Jenny's White Haven

Full-stack staycation reservation platform, CMS, and operations dashboard for **Jenny's White Haven** on Camotes Island, Cebu.

- **Public Visitor Experience** — Aman-inspired coastal calm with hero carousel & availability search, Standard / Deluxe / Whole House accommodations, adult & child extra-person pricing, global `Intl.NumberFormat` currency display converter (PHP billing source of truth), Camotes Island tourist spots guide, photo gallery, verified post-stay guest reviews, contact & Google Map directions, privacy-first cookie preferences & page-view analytics, and real-time guest live chat support.
- **Admin Operations Dashboard** — Clean Shopify-style back office with KPI overview, bookings table & 14-day room calendar, house/room blocked-date management, rooms & R2 media management, guest profiles, 2-pane live chat support inbox (with in-app & SMTP email alerts), guest review moderation, collapsible website CMS editor, financial/occupancy/analytics reports, notifications, and RBAC staff & session audit management.

## Tech Stack

- **Framework:** TanStack Start (file-based routing) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + Lucide Icons
- **Database & ORM:** PostgreSQL + Prisma
- **Authentication & RBAC:** Better Auth (`/api/auth/$`) + role permissions (`super_admin`, `owner`, `manager`, `receptionist`)
- **Storage & Media:** Cloudflare R2 (presigned uploads, relational media keys) + Cloudflare CDN (`WebP` / `AVIF`)
- **Transactional Email:** Nodemailer SMTP (account activation, password reset, live chat inquiry & guest reply alerts)
- **Testing & Quality:** Vitest + Testing Library + ESLint (`@tanstack/eslint-config`) + Prettier
- **Package Manager & Hosting:** `pnpm` · Deployed on Vercel (`vercel.json`)

## Getting Started

1. **Install dependencies** (always use `pnpm`):

   ```bash
   pnpm install
   ```

2. **Configure environment variables**:

   Copy `.env.example` to `.env` and configure PostgreSQL (`DATABASE_URL`), Better Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), Cloudflare R2 credentials, and SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

3. **Generate Prisma client & sync schema**:

   ```bash
   pnpm db:generate
   pnpm db:push
   ```

4. **Start the development server** (runs on `http://localhost:3000`):

   ```bash
   pnpm dev
   ```

5. **First-time Super Admin setup**:

   When zero users exist in PostgreSQL, visiting `/admin` redirects automatically to `/admin/setup` to provision and verify the initial `super_admin` account via email. No default credentials or seeders exist in code.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Vite + TanStack Start dev server on port 3000 |
| `pnpm build` | Generate Prisma client and build production bundle |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run ESLint across the repository |
| `pnpm format` | Format code with Prettier and fix ESLint issues |
| `pnpm check` | Check Prettier formatting and ESLint rules |
| `pnpm test` | Run unit tests with Vitest |
| `pnpm coverage` | Run Vitest suite with V8 coverage report |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push `prisma/schema.prisma` changes to PostgreSQL |

## Production & Database Rollout

- **Database schema sync:** `pnpm build` runs `prisma generate && vite build` and does **not** mutate your database automatically. Whenever deploying schema additions (such as `Room` extra-person fees, `BlockedDate`, `Review`, `PageView`, `ChatConversation`, `ChatMessage`, or `User` chat presence columns), run `pnpm db:push` against the target database before serving traffic.
- **Environment security:** Variables prefixed with `VITE_` are exposed to the client bundle. Keep all database, auth, SMTP, and R2 secrets unprefixed so they remain server-only.

## Project Conventions

Detailed engineering and design conventions live in [`AGENTS.md`](./AGENTS.md) and [`docs/`](./docs):

- [`docs/stack-conventions.md`](./docs/stack-conventions.md)
- [`docs/command-conventions.md`](./docs/command-conventions.md)
- [`docs/structure-conventions.md`](./docs/structure-conventions.md)
- [`docs/rules-conventions.md`](./docs/rules-conventions.md)
- [`docs/style-conventions.md`](./docs/style-conventions.md)
- [`docs/auth-conventions.md`](./docs/auth-conventions.md)
- [`docs/client-design.md`](./docs/client-design.md)
