# Stack conventions

- TanStack Start (file-router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL
- Better Auth (authentication)
- Cloudflare R2 (file storage) + Cloudflare CDN
- WebP / AVIF (image optimization)
- Presigned URLs (upload mechanism)
- pnpm
- Deploy target: Vercel

Notes:

- Prefer server functions (`createServerFn`) for data fetching and mutations.
- Database access only through Prisma.
- Authentication handled only by Better Auth.
- Media relationships use explicit foreign keys (`User -> Media`, `Room -> RoomMedia -> Media`, `Booking -> BookingMedia -> Media`, `Business -> BusinessMedia -> Media`).
