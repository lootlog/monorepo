# @lootlog/api

Main NestJS backend for Lootlog clan management.

## Overview

- Owns the core HTTP API for guilds, members, loots, timers, reservations, chat, notifications, events, maps, kills, and user-facing configuration.
- Uses Effect-native Drizzle PostgreSQL access, BullMQ with Redis for background work, and shared auth and permission layers across the monorepo.
- Composes feature modules from `src/app.module.ts` and exposes a health check through the local `healthz` module.

## Development

Run commands from the monorepo root:

```bash
bun run db:api:generate
bun run db:api:migrate:dev
bun run --filter=@lootlog/api dev
```

## Key Scripts

- `bun run --filter=@lootlog/api build`
- `bun run --filter=@lootlog/api lint`
- `bun run --filter=@lootlog/api test`
- `bun run --filter=@lootlog/api test:e2e`
- `bun run db:api:migrate:deploy`
- `bun run db:api:studio`

## Notes

- Drizzle schema lives in `src/database/drizzle/schema.ts`; immutable legacy migration evidence lives in `drizzle/legacy-prisma/`.
- Production start imports the generated observability bootstrap from `dist/instrumentation.js`.
