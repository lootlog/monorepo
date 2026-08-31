# @lootlog/activity

NestJS service for guild activity logs and related admin queries.

## Overview

- Stores and serves activity log data grouped by guild and user.
- Provides suggestion endpoints for actor names, clan names, and worlds to power admin filters.
- Uses the Prisma contract-first PostgreSQL runtime, shared auth guards, and permission checks for protected endpoints.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/activity activity:contract:emit
pnpm --filter @lootlog/activity activity:migration:plan
pnpm --filter @lootlog/activity activity:db:migrate
pnpm --filter @lootlog/activity dev
```

## Key Scripts

- `pnpm --filter @lootlog/activity build`
- `pnpm --filter @lootlog/activity lint`
- `pnpm --filter @lootlog/activity test`
- `pnpm --filter @lootlog/activity test:e2e`
- `pnpm --filter @lootlog/activity test:database`

## Database Deployment

Fresh databases are created by the committed Prisma baseline with
`activity:db:migrate`. The baseline also installs TimescaleDB, converts
`Activity` into a hypertable with one-day chunks, and configures seven-day
retention.

For the one-time adoption of a database previously managed by Prisma 7, first
deploy every Prisma 7 migration from the previous immutable release:

```bash
pnpm --filter @lootlog/activity exec prisma migrate deploy
```

The last applied Prisma 7 migration must be
`20260623090000_add_member_activity_sessions`. Prisma signing verifies the
live schema; it does not apply missing legacy migrations. From the Prisma
release checkout, point `POSTGRESQL_CONNECTION_URI` at the database and run:

```bash
pnpm --filter @lootlog/activity activity:db:sign
pnpm --filter @lootlog/activity activity:migration:status
pnpm --filter @lootlog/activity activity:db:verify
```

Any mismatch blocks the release. Do not run the Prisma baseline against a
populated database. Signing leaves the existing `_prisma_migrations` table
intact. Deploy API, Activity, and Search together for the first Prisma
cutover. Subsequent deployments must run `activity:db:migrate` before the
application starts. Use `activity:migrate:dev` only for local development
databases.

## Notes

- HTTP routes are implemented in `src/activities/activities.controller.ts`.
- The active Prisma contract lives in `src/prisma/contract.prisma`; the legacy
  Prisma 7 schema and SQL migrations live under `test/fixtures/prisma7/` and
  are replayed by the database cutover test.
