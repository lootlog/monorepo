# @lootlog/gateway

Schema-first Bun WebSocket gateway for realtime subscriptions and event fan-out.

## Overview

- Hosts the MessagePack v1 protocol from `@lootlog/protocol/realtime`.
- Keeps logical subscriptions server-side; clients never submit transport room names.
- Federates live sessions and ephemeral presence through Redis and consumes RabbitMQ through `@lootlog/messaging`.
- Expires presence after 60 seconds and expects heartbeats every 25 seconds.

## Development

Run commands from the monorepo root:

```bash
bun run --filter @lootlog/gateway dev
```

## Source layout

- `src/realtime` owns sessions, subscriptions, presence, map pings, and air tags.
- `src/auth`, `src/guilds`, and `src/rabbit` own their respective integration capabilities.
- `src/http-api/contracts` owns the health contract; `src/app.ts` is the scoped composition root.
- Small domain artifacts live beside their capability instead of in `constants`, `types`, or `utils` folders.

## Key Scripts

- `bun run --filter @lootlog/gateway build`
- `bun run --filter @lootlog/gateway start`
- `bun run --filter @lootlog/gateway lint`
- `bun run --filter @lootlog/gateway test`
- `bun run --filter @lootlog/gateway test:e2e`

## Notes

- Runtime wiring lives in `src/app.ts` and is acquired as scoped Effect layers.
- Authentication uses the first-party session cookie. Cross-origin game clients
  send a short-lived, one-time ticket in `Sec-WebSocket-Protocol`; the Gateway
  echoes only `lootlog.realtime.v1`. Node clients may use the authorization
  upgrade header. Credentials are never accepted from the query string.
