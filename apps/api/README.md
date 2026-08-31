# @lootlog/api

Main NestJS backend for Lootlog clan management.

## Overview

- Owns the core HTTP API for guilds, members, loots, timers, reservations, chat, notifications, events, maps, kills, and user-facing configuration.
- Uses the Prisma contract-first PostgreSQL runtime for database access, BullMQ with Redis for background work, and shared auth and permission layers across the monorepo.
- Composes feature modules from `src/app.module.ts` and exposes a health check through the local `healthz` module.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/api api:contract:emit
pnpm --filter @lootlog/api api:migration:plan
pnpm --filter @lootlog/api api:db:migrate
pnpm --filter @lootlog/api dev
```

## Key Scripts

- `pnpm --filter @lootlog/api build`
- `pnpm --filter @lootlog/api lint`
- `pnpm --filter @lootlog/api test`
- `pnpm --filter @lootlog/api test:e2e`
- `pnpm --filter @lootlog/api test:database`

## Database Deployment

Fresh databases are created by the committed Prisma baseline with
`api:db:migrate`. For the one-time adoption of a database previously managed
by Prisma 7, first deploy every Prisma 7 migration from the previous immutable
release:

```bash
pnpm --filter @lootlog/api exec prisma migrate deploy
```

The last applied Prisma 7 migration must be
`20260829043000_archive_comment_only_organization_loot_records`. Prisma
signing verifies the live schema; it does not apply missing legacy migrations.
From the Prisma release checkout, point `POSTGRESQL_CONNECTION_URI` at the
database and run:

```bash
pnpm --filter @lootlog/api api:db:sign
pnpm --filter @lootlog/api api:migration:status
pnpm --filter @lootlog/api api:db:verify
```

Any mismatch blocks the release. Do not run the Prisma baseline against a
populated database. Signing adds the Prisma marker without removing the
existing `_prisma_migrations` table.

Deploy API, Activity, and Search together for the first Prisma cutover.
Subsequent production deployments must run `api:db:migrate` before the
application starts. Use `api:migrate:dev` only for local development databases.

## Notes

- The active Prisma contract lives in `src/prisma/contract.prisma`; the legacy
  Prisma 7 schema and SQL migrations live under `test/fixtures/prisma7/` and
  are replayed by the database cutover test.
- The baseline preserves legacy empty-array defaults and installs the
  `Reservation_rollout_bridge` trigger used during the coordinated rollout.
- Production start imports the generated observability bootstrap from `dist/instrumentation.js`.
