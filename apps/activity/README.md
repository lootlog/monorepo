# @lootlog/activity

NestJS service for guild activity logs and related admin queries.

## Overview

- Stores and serves activity log data grouped by guild and user.
- Provides suggestion endpoints for actor names, clan names, and worlds to power admin filters.
- Uses Prisma, shared auth guards, and permission checks for protected endpoints.

## Development

Run commands from the monorepo root:

```bash
pnpm activity:contract:emit
pnpm activity:migration:plan
pnpm activity:db:migrate
pnpm activity:db:verify
pnpm --filter @lootlog/activity dev
```

## Key Scripts

- `pnpm --filter @lootlog/activity build`
- `pnpm --filter @lootlog/activity lint`
- `pnpm --filter @lootlog/activity test`
- `pnpm --filter @lootlog/activity test:e2e`
- `pnpm --filter @lootlog/activity test:database`

## Prisma 8

- The authored contract is `prisma/contract.prisma`. Emitted runtime files are committed under `src/shared/db/generated/`.
- Prisma 8 migrations and the `db` ref live under `migrations/`. The retired Prisma 7 schema and migration history remain under `test/fixtures/prisma7/` for upgrade tests.

Before the first Prisma 8 deployment, apply every Prisma 7 migration from the previous immutable release. `db sign` verifies the live schema; it does not apply missing legacy migrations. From the Prisma 7 release checkout, run:

```bash
pnpm --filter @lootlog/activity exec prisma migrate deploy
```

The last applied Prisma 7 migration must be `20260623090000_add_member_activity_sessions`.

Do not run the Prisma 8 baseline against an existing database. After the Prisma 7 deploy, point `POSTGRESQL_CONNECTION_URI` at the database and run from the Prisma 8 release checkout:

```bash
pnpm activity:db:sign
pnpm activity:migration:status
pnpm activity:db:verify
```

Any mismatch blocks the release. Signing keeps the existing `_prisma_migrations` table intact.

For a new database, run:

```bash
pnpm activity:db:migrate
pnpm activity:db:verify
```

The baseline enables TimescaleDB, converts `Activity` to a hypertable, sets a one-day chunk interval, and configures seven-day retention.

## Runtime

- HTTP routes are implemented in `src/activities/activities.controller.ts`.
- The health check runs `SELECT 1` through the service-owned PostgreSQL pool.
- NestJS remains CommonJS. Node.js 24 loads the ESM-only Prisma 8 runtime through the service-local adapter.
