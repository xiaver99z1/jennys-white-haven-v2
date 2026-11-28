# Commands conventions

## Package Manager

- Always use `pnpm` (never npm or yarn)

## Development

- `pnpm install` — install dependencies
- `pnpm dev` — start development server (port 3000)
- `pnpm build` — generate Prisma client + production Vite build
- `pnpm preview` — preview production build
- `pnpm generate-routes` — regenerate `src/routeTree.gen.ts`

## Code Quality & Testing

- `pnpm exec tsc --noEmit` — run strict TypeScript typecheck
- `pnpm lint` — run ESLint (`@tanstack/eslint-config`)
- `pnpm format` — format with Prettier + ESLint fix
- `pnpm check` — verify Prettier formatting + ESLint
- `pnpm test` (`pnpm vitest run`) — run unit and component tests
- `pnpm coverage` — run Vitest with V8 coverage thresholds

## Prisma & Database

- `pnpm db:generate` (`pnpm exec prisma generate`) — generate Prisma client
- `pnpm db:push` (`pnpm exec prisma db push`) — push schema changes to the database. **Important rollout step:** because `pnpm build` only runs `prisma generate`, always run `pnpm db:push` against existing databases to apply new models and columns (such as `Room.extraPersonFee`, `Room.extraChildFee`, `BlockedDate`, `Review`, `PageView`, `ChatConversation`, `ChatMessage`, and `User.chatAvailable` / `User.lastSeenAt`) before starting or serving requests with the new build.
- `pnpm exec prisma migrate dev` — create and apply migration
- `pnpm exec prisma studio` — open Prisma Studio

## Auth related

- After changing Better Auth config or schema → run `pnpm db:generate` and `pnpm db:push`
- Initial Super Admin creation is handled via `/admin/setup` on first visit when no users exist in the database (`prisma/seed.ts` was removed so no default password exists in code)
