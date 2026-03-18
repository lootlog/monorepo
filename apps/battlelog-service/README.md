# @lootlog/battlelog-service

NestJS service for battle logs, dashboards, and player analytics.

## Overview

- Stores battle data and exposes authenticated and public battle views under the `battles` domain.
- Provides per-user dashboards, statistics, growth charts, search, and raw battle payload access.
- Uses Prisma for persistence and integrates with Redis, R2, and shared auth guards.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/battlelog-service battlelog:generate
pnpm --filter @lootlog/battlelog-service battlelog:migrate:dev
pnpm --filter @lootlog/battlelog-service dev
```

## Key Scripts

- `pnpm --filter @lootlog/battlelog-service battlelog:studio`
- `pnpm --filter @lootlog/battlelog-service build`
- `pnpm --filter @lootlog/battlelog-service test`
- `pnpm --filter @lootlog/battlelog-service test:e2e`

## Notes

- Prisma schema and migrations live in `prisma/`.
- Production entrypoints import `dist/instrumentation.js` before bootstrapping the app.
