# @lootlog/search

Bun and Effect service for Meilisearch-backed search endpoints.

## Overview

- Exposes search routes for `players`, `npcs`, `items`, and aggregated `all` results.
- Runs scoped RabbitMQ consumers that keep Meilisearch indexes in sync.
- Uses Effect configuration, logging, OTLP telemetry, and resource-safe shutdown.

## Routes

- `/players`
- `/npcs`
- `/items`
- `/all`
- `/healthz`

## Development

Run commands from the monorepo root:

```bash
bun run --filter @lootlog/search dev
```

## Source layout

- `src/items`, `src/npcs`, `src/players`, and `src/all` own their query, indexing, and response models.
- `src/meilisearch` owns index composition and query translation.
- `src/http-api/contracts` owns deployed schemas; `src/http-api/handlers` contains one thin adapter per contract group.
- Meilisearch payloads use explicit `*Command`, `*Query`, and `*Response` names instead of local DTO folders.

## Key Scripts

- `bun run --filter @lootlog/search build`
- `bun run --filter @lootlog/search start`
- `bun run --filter @lootlog/search test`
- `bun run --filter @lootlog/search openapi:generate`

## Notes

- Service bootstrap lives in `src/main.ts`.
- Meilisearch remains a rebuildable projection; Search does not own a database.
