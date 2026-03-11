# @lootlog/gateway

Real-time NestJS gateway for WebSocket subscriptions and event fan-out.

## Overview

- Hosts the Socket.IO gateway used by Lootlog clients for live updates.
- Manages presence, subscriptions, activity propagation, retries, and queue-driven broadcasts.
- Integrates with RabbitMQ, Redis, and scheduled jobs through the `gateway` module.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/gateway dev
```

## Key Scripts

- `pnpm --filter @lootlog/gateway build`
- `pnpm --filter @lootlog/gateway start`
- `pnpm --filter @lootlog/gateway lint`
- `pnpm --filter @lootlog/gateway test`
- `pnpm --filter @lootlog/gateway test:e2e`

## Notes

- Runtime wiring lives in `src/gateway/gateway.module.ts`.
- Production start imports the generated observability bootstrap from `dist/instrumentation.js`.
