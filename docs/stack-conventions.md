# Stack conventions

- TanStack Start (file-router) + React 19 + TypeScript
- Tailwind CSS v4 + Lucide React icons
- Prisma + PostgreSQL
- Better Auth (authentication & session management)
- Cloudflare R2 (file storage via presigned URLs) + Cloudflare CDN
- WebP / AVIF (client + CDN image optimization)
- Nodemailer SMTP (verification, password-reset, and live-chat notification emails)
- Native `Intl.NumberFormat` & `Intl.DateTimeFormat` (client currency display conversion & cached date/time formatting)
- Vitest + Testing Library (unit & component testing)
- `pnpm` (package manager)
- Deploy target: Vercel

Notes:

- Prefer server functions (`createServerFn`) for data fetching and mutations.
- Database access only through Prisma.
- Authentication handled only by Better Auth.
- All reservation rates, payments, and balances are stored and billed in **Philippine Pesos (`PHP`)**; foreign currencies selected on public pages are display estimates only.
- Media relationships use explicit foreign keys (`User -> Media`, `Room -> RoomMedia -> Media`, `Booking -> BookingMedia -> Media`, `Business -> BusinessMedia -> Media`).
