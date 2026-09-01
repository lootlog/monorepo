# @lootlog/activity

NestJS service for guild activity logs and related admin queries.

## Overview

- Stores and serves activity log data grouped by guild and user.
- Provides suggestion endpoints for actor names, clan names, and worlds to power admin filters.
- Uses Prisma, shared auth guards, and permission checks for protected endpoints.

## Development

Run commands from the monorepo root:

```bash
pnpm db:activity:generate
pnpm db:activity:migrate:dev
pnpm --filter @lootlog/activity dev
```

## Key Scripts

- `pnpm --filter @lootlog/activity build`
- `pnpm --filter @lootlog/activity lint`
- `pnpm --filter @lootlog/activity test`
- `pnpm --filter @lootlog/activity test:e2e`
- `pnpm db:activity:migrate:deploy`
- `pnpm db:activity:studio`

## Notes

- HTTP routes are implemented in `src/activities/activities.controller.ts`.
- Prisma schema and generated client live under `prisma/`.
