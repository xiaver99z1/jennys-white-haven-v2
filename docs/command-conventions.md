# Commands conventions

## Package Manager

- Always use `pnpm` (never npm or yarn)

## Development

- `pnpm install` — install dependencies (runs `postinstall` -> `pnpm prisma generate`)
- `pnpm dev` — start development server (`vite dev --port 3000`)
- `pnpm build` — generate Prisma client + production Vite build (`pnpm db:generate && vite build`)
- `pnpm preview` — preview production build (`vite preview`)
- `pnpm generate-routes` — regenerate `src/routeTree.gen.ts` (`tsr generate`)

## Code Quality & Testing

- `pnpm exec tsc --noEmit` — run strict TypeScript typecheck
- `pnpm lint` — run ESLint (`eslint`)
- `pnpm format` — format with Prettier + ESLint fix (`prettier --write . && eslint --fix`)
- `pnpm check` — check formatting with Prettier (`prettier --check .`)
- `pnpm test` — start Vitest in interactive/watch mode (`vitest`)
- `pnpm vitest run` — run unit and component tests once without watch mode
- `pnpm coverage` — run Vitest once with V8 coverage report (`vitest run --coverage`, covering `src/components/**` and `src/server/**`)

## Prisma & Database

- `pnpm db:generate` (`pnpm exec prisma generate`) — generate Prisma client
- `pnpm db:push` (`pnpm exec prisma db push`) — push schema changes to the database. **Important rollout step:** because `pnpm build` only runs `pnpm db:generate`, always run `pnpm db:push` against existing databases to apply new models and columns (such as `Room.extraPersonFee`, `Room.extraChildFee`, `BlockedDate`, `Review`, `PageView`, `ChatConversation`, `ChatMessage`, and `User.chatAvailable` / `User.lastSeenAt`) before starting or serving requests with the new build.
- `pnpm exec prisma migrate dev` — create and apply migration
- `pnpm db:studio` (`pnpm exec prisma studio --port 5555`) — open Prisma Studio on port 5555

## Auth related

- After changing Better Auth config or schema → run `pnpm db:generate` and `pnpm db:push`
- Initial Super Admin creation is handled via `/admin/setup` on first visit when no users exist in the database (`prisma/seed.ts` was removed so no default password exists in code)
