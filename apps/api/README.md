# @lootlog/api

Main NestJS backend for Lootlog clan management.

## Overview

- Owns the core HTTP API for guilds, members, loots, timers, reservations, chat, notifications, events, maps, kills, and user-facing configuration.
- Uses Prisma for database access, BullMQ with Redis for background work, and shared auth and permission layers across the monorepo.
- Composes feature modules from `src/app.module.ts` and exposes a health check through the local `healthz` module.

## Development

Run commands from the monorepo root:

```bash
pnpm api:contract:emit
pnpm api:migration:plan
pnpm api:db:migrate
pnpm api:db:verify
pnpm --filter @lootlog/api dev
```

## Key Scripts

- `pnpm --filter @lootlog/api build`
- `pnpm --filter @lootlog/api lint`
- `pnpm --filter @lootlog/api test`
- `pnpm --filter @lootlog/api test:e2e`
- `pnpm --filter @lootlog/api test:database`

## Prisma 8

- The authored contract is `prisma/contract.prisma`. Emitted runtime files are committed under `src/db/generated/`.
- Prisma 8 migrations and the `db` ref live under `migrations/`. The retired Prisma 7 schema and migration history remain under `test/fixtures/prisma7/` for upgrade tests.
- The API owns this database. Search reads it through PostgreSQL, and the seed command uses the API-local database adapter.

Before the first Prisma 8 deployment, apply every Prisma 7 migration from the previous immutable release. `db sign` verifies the live schema; it does not apply missing legacy migrations. From the Prisma 7 release checkout, run:

```bash
pnpm --filter @lootlog/api exec prisma migrate deploy
```

The last applied Prisma 7 migration must be `20260826123000_reservations_v2_constraint_alignment`.

Do not run the Prisma 8 baseline against an existing database. After the Prisma 7 deploy, point `POSTGRESQL_CONNECTION_URI` at the database and run from the Prisma 8 release checkout:

```bash
pnpm api:db:sign
pnpm api:migration:status
pnpm api:db:verify
```

Any mismatch blocks the release. Signing adds the Prisma 8 contract marker; it does not remove the existing `_prisma_migrations` table.

For a new database, run:

```bash
pnpm api:db:migrate
pnpm api:db:verify
```

The baseline also creates `Reservation_rollout_bridge` and its trigger.

## Runtime

- NestJS remains CommonJS. Node.js 24 loads the ESM-only Prisma 8 runtime through the service-local adapter.
- Production start imports the generated observability bootstrap from `dist/instrumentation.js`.
