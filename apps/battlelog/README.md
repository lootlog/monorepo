# @lootlog/battlelog

Bun and Effect service for battle logs, dashboards, and player analytics.

## Overview

- Stores battle data and exposes authenticated and public battle views under the `battles` domain.
- Provides per-user dashboards, statistics, growth charts, search, and raw battle payload access.
- Uses Drizzle for PostgreSQL persistence and scoped Effect layers for Redis, R2, BullMQ, HTTP, logging, and OpenTelemetry.
- Keeps the deployment identity `battlelog-service` while the workspace and package are named `apps/battlelog` and `@lootlog/battlelog`.

## Development

Run commands from the monorepo root:

```bash
bun run db:battlelog:generate
bun run db:battlelog:push
bun run --filter @lootlog/battlelog dev
```

## Source layout

- `src/battles/submission`, `catalog`, `analytics`, `statistics`, and `deletion` group behavior by capability.
- `src/http-api/contracts` owns deployed schemas; `src/http` adapts those contracts to battle operations.
- `src/database` owns the Drizzle schema and connection adapter.
- `src/infrastructure` owns Redis, R2, logging, HTTP errors, and query decoding.
- `src/battlelog-application.ts` is the composition root.

## Key Scripts

- `bun run db:battlelog:migrate:deploy`
- `bun run db:battlelog:migrate:init`
- `bun run db:battlelog:studio`
- `bun run --filter @lootlog/battlelog build`
- `bun run --filter @lootlog/battlelog test`
- `bun run --filter @lootlog/battlelog test:e2e`

## Notes

- Drizzle schema and migrations live in `src/database/` and `drizzle/`.
- `BunRuntime.runMain` owns SIGINT/SIGTERM shutdown and closes the HTTP server, workers, queues, Redis, and PostgreSQL resources in scope order.
- `openapi.yaml` is the compatibility artifact for the 26 deployed operations and is checked by deterministic generation.
