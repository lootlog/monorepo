# @lootlog/api

Main NestJS backend for Lootlog clan management.

## Overview

- Owns the core HTTP API for guilds, members, loots, timers, reservations, chat, notifications, events, maps, kills, and user-facing configuration.
- Uses Prisma for database access, BullMQ with Redis for background work, and shared auth and permission layers across the monorepo.
- Composes feature modules from `src/app.module.ts` and exposes a health check through the local `healthz` module.

## Development

Run commands from the monorepo root:

```bash
pnpm db:api:generate
pnpm db:api:migrate:dev
pnpm --filter @lootlog/api dev
```

## Key Scripts

- `pnpm --filter @lootlog/api build`
- `pnpm --filter @lootlog/api lint`
- `pnpm --filter @lootlog/api test`
- `pnpm --filter @lootlog/api test:e2e`
- `pnpm db:api:migrate:deploy`
- `pnpm db:api:studio`

## Notes

- Prisma schema lives in `prisma/schema.prisma`.
- Production start imports the generated observability bootstrap from `dist/instrumentation.js`.
