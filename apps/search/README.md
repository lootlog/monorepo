# @lootlog/search

NestJS service for Meilisearch-backed search endpoints.

## Overview

- Exposes search routes for `players`, `npcs`, `items`, and aggregated `all` results.
- Registers RabbitMQ subscribers that keep Meilisearch indexes in sync.
- Reuses shared Nest logging middleware and shared observability bootstrap from `@lootlog/instrumentation`.

## Routes

- `/players`
- `/npcs`
- `/items`
- `/all`
- `/healthz`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/search dev
```

## Key Scripts

- `pnpm --filter @lootlog/search build`
- `pnpm --filter @lootlog/search start`
- `pnpm --filter @lootlog/search seed`

## Notes

- Service bootstrap lives in `src/main.ts`.
- Seed helpers for local Meilisearch data live under `src/scripts/`.
