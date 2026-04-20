# @lootlog/activity

Hono service for guild activity logs and related admin queries.

## Overview

- Stores and serves activity log data grouped by guild and user.
- Provides suggestion endpoints for actor names, clan names, and worlds to power admin filters.
- Uses Prisma, Hono middleware, and permission checks for protected endpoints.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/activity activity:generate
pnpm --filter @lootlog/activity activity:migrate:dev
pnpm --filter @lootlog/activity dev
```

## Key Scripts

- `pnpm --filter @lootlog/activity build`
- `pnpm --filter @lootlog/activity lint`
- `pnpm --filter @lootlog/activity test`
- `pnpm --filter @lootlog/activity test:e2e`

## Notes

- HTTP routes are implemented under `src/activities/routes/`.
- Prisma schema and generated client live under `prisma/`.
