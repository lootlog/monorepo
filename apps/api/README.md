# @lootlog/api

Main Effect HttpApi backend for Lootlog organization management.

## Overview

- Owns the core HTTP API for guilds, members, loots, timers, reservations, chat, notifications, events, maps, kills, and user-facing configuration.
- Uses Effect-native Drizzle PostgreSQL access, BullMQ with Redis for background work, and shared auth and permission layers across the monorepo.
- Composes typed handler and infrastructure Layers under `src/http-api` and exposes health through the generated HttpApi contract.

## Source layout

- `src/<domain>` contains domain behavior grouped by capability. Larger domains such as events, loots, and notifications use capability folders instead of artifact-type folders such as `dto`, `constants`, `services`, or `utils`.
- `src/http-api/contracts/<group>` is the deployed HTTP contract boundary. Each group owns its Effect schemas and API declaration.
- `src/http-api/handlers/<group>` is the thin adapter for the matching contract group. Shared workflows live in named capability modules such as `records`, `settings`, `account-organization`, and `organization-workspace`.
- `src/http-api/runtime` is split into `application`, `auth`, `background`, `composition`, and `infrastructure`; it wires domain capabilities without owning their contracts.
- RabbitMQ payload schemas and inferred event types come from `@lootlog/protocol` rather than API-local transport DTOs.

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
