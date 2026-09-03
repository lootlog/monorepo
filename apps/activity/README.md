# @lootlog/activity

Bun and Effect service for Organization activity logs and related admin queries.

## Overview

- Stores and serves activity log data grouped by guild and user.
- Provides suggestion endpoints for actor names, clan names, and worlds to power admin filters.
- Uses Drizzle with `@effect/sql-pg`, RabbitMQ consumers, and capability checks for protected endpoints.
- Preserves the TimescaleDB one-day chunk interval and seven-day retention policy.

## Development

Run commands from the monorepo root:

```bash
bun --filter @lootlog/activity db:migrate:dev
bun --filter @lootlog/activity dev
```

## Source layout

- `src/activities` owns activity ingestion, modeling, authorization, signatures, and persistence.
- `src/http-api/contracts` owns the deployed Effect HTTP contract; `src/http` adapts it to domain modules and Bun.
- `src/database`, `src/config`, and `src/openapi` are explicit infrastructure seams.

## Key Scripts

- `bun --filter @lootlog/activity build`
- `bun --filter @lootlog/activity lint`
- `bun --filter @lootlog/activity typecheck`
- `bun --filter @lootlog/activity test`
- `bun --filter @lootlog/activity openapi:generate`
- `bun --filter @lootlog/activity db:migrate:deploy`

## Notes

- HTTP adaptation lives in `src/http/activity-http.ts`.
- Drizzle schema and the accepted baseline live under `src/database` and `drizzle/migrations`.
- `prisma/migrations` is an immutable archive used to audit existing databases; Prisma is not used at runtime.
- Startup fails closed unless the physical tables, enums, indexes, hypertable configuration, and retention policy match the accepted legacy fingerprint.
