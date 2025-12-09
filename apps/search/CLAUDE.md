# Search Service

Full-text search engine powered by Meilisearch with event-driven indexing.

## Tech Stack

- Hono (web framework)
- Meilisearch on port 7700
- RabbitMQ for index updates
- OpenTelemetry instrumentation

## Commands

```bash
pnpm dev    # Start dev server on port 3035
pnpm seed   # Seed Meilisearch indices
pnpm build  # Build with pkgroll
```

## Key Files

- `src/index.ts` - Entry point, middleware, routes
- `src/players/`, `src/items/`, `src/npcs/` - Search modules (controller, service, handlers)
- `src/lib/meilisearch.ts` - Meilisearch client
- `src/lib/rabbitmq.ts` - AMQP setup

## API Endpoints

- `GET /players?search=name&limit=10&world=1`
- `GET /items?search=sword&limit=10&world=1`
- `GET /npcs?search=dragon&limit=10`
- `GET /all?search=query` - Unified search

## Architecture

RabbitMQ events trigger index updates. Services handle Meilisearch operations. Controllers validate input with Zod schemas. Sub-millisecond search responses with typo tolerance.
