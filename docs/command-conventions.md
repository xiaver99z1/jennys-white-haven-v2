# Commands conventions

## Package Manager

- Always use `pnpm` (never npm or yarn)

## Development

- `pnpm install` — install dependencies
- `pnpm dev` — start development server (port 3000)
- `pnpm build` — production build
- `pnpm preview` — preview production build

## Code Quality

- `pnpm lint` — run ESLint
- `pnpm format` — format with Prettier + ESLint fix
- `pnpm check` — check formatting

## Prisma & Database

- `pnpm exec prisma generate` — generate Prisma client
- `pnpm exec prisma db push` (`pnpm db:push`) — push schema changes to the database. **Important rollout step:** because `pnpm build` only runs `prisma generate`, always run `pnpm db:push` against existing databases to apply new columns (such as `Room.extraPersonFee`) before starting or serving requests with the new build.
- `pnpm exec prisma migrate dev` — create and apply migration
- `pnpm exec prisma studio` — open Prisma Studio

## Auth related

- After changing Better Auth config or schema → run `pnpm exec prisma generate` and `pnpm exec prisma db push`
- Initial Super Admin creation is handled via `/admin/setup` on first visit when no users exist in the database (`prisma/seed.ts` was removed so no default password exists in code)
