# @lootlog/battlelog-service

NestJS service for battle logs, dashboards, and player analytics.

## Overview

- Stores battle data and exposes authenticated and public battle views under the `battles` domain.
- Provides per-user dashboards, statistics, growth charts, search, and raw battle payload access.
- Uses Drizzle for PostgreSQL persistence and integrates with Redis, R2, and shared auth guards.

## Development

Run commands from the monorepo root:

```bash
pnpm db:battlelog:generate
pnpm db:battlelog:push
pnpm --filter @lootlog/battlelog-service dev
```

## Key Scripts

- `pnpm db:battlelog:migrate:deploy`
- `pnpm db:battlelog:migrate:init`
- `pnpm db:battlelog:studio`
- `pnpm --filter @lootlog/battlelog-service build`
- `pnpm --filter @lootlog/battlelog-service test`
- `pnpm --filter @lootlog/battlelog-service test:e2e`

## Notes

- Drizzle schema and migrations live in `src/shared/modules/drizzle/` and `drizzle/`.
- Production entrypoints import `dist/instrumentation.js` before bootstrapping the app.
