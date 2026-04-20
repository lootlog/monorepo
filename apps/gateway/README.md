# @lootlog/gateway

Real-time Hono service for WebSocket subscriptions, presence tracking, and queue-driven event fan-out.

## Overview

- Hosts the Socket.IO gateway used by Lootlog clients for live updates.
- Exposes HTTP routes through Hono and keeps `/healthz` for service probes.
- Manages presence, subscriptions, activity propagation, retries, and queue-driven broadcasts.
- Integrates with RabbitMQ via `amqp-connection-manager` and with Redis through `ioredis` plus the Socket.IO Redis adapter.

## Runtime layout

- HTTP bootstrap: `src/index.ts`
- Hono app wiring: `src/app.ts`
- Socket.IO runtime: `src/gateway/gateway-socket-runtime.ts`
- RabbitMQ runtime: `src/gateway/rabbitmq/gateway-rabbitmq-runtime.ts`
- Shared HTTP helpers: `@lootlog/hono-shared`

## Environment

See `.env.example`. Required values are:

- `PORT`
- `ENV`
- `SERVICE_NAME`
- `API_URL`
- `RABBITMQ_URI`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_USERNAME`
- `REDIS_PASSWORD`

Optional telemetry values:

- `APP_VERSION`
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_EXPORTER_OTLP_HEADERS`
- `SERVICE_NAMESPACE`
- `AXIOM_TOKEN`
- `AXIOM_DATASET`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/gateway dev
```

The dev entrypoint watches `src/index.ts`.

## Key Scripts

- `pnpm --filter @lootlog/gateway build`
- `pnpm --filter @lootlog/gateway start`
- `pnpm --filter @lootlog/gateway start:prod`
- `pnpm --filter @lootlog/gateway lint`
- `pnpm --filter @lootlog/gateway test`
- `pnpm --filter @lootlog/gateway test:e2e`

## Notes

- In `local`, Socket.IO runs under the `/gateway` namespace. In other environments it uses the root namespace to preserve the existing deployment contract.
- RabbitMQ topology is asserted on startup, including retry queues and DLQs.
- Production startup runs directly from `dist/index.js`; observability is initialized inside the process bootstrap.
