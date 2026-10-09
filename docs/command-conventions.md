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
- `pnpm exec prisma db push` — push schema changes (development)
- `pnpm exec prisma migrate dev` — create and apply migration
- `pnpm exec prisma studio` — open Prisma Studio
- `pnpm seed` — run database seed (create admin user)

## Auth related

- After changing Better Auth config or schema → run `pnpm exec prisma generate` and `pnpm exec prisma db push`
