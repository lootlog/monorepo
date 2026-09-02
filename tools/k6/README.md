# Lootlog k6 Performance Tests

This folder contains protocol-level performance tests for Lootlog services.
HTTP/OpenAPI services use k6. The gateway uses a Bun runner with the same
MessagePack realtime v1 client as Web and Game Client.

## Install

```bash
brew install k6
k6 version
```

## Secrets

Copy the example file and add a dedicated test account credential:

```bash
cp tools/k6/.secrets.example tools/k6/.secrets.local
```

Use one of:

```dotenv
AUTH_TICKETS=single-use-ticket-1,single-use-ticket-2
AUTH_COOKIE=local.session_token=...
```

Provide at least one unique websocket ticket per requested Gateway connection.
Tickets are single-use and are sent only in the upgrade header. A first-party
session cookie may be reused for local load tests.

`tools/k6/.secrets.local` is ignored by git. Do not put real credentials in
tracked files or command output.

## HTTP Tests

Run the whole read-only smoke matrix:

```bash
bun run perf:k6:smoke
```

Run a single service:

```bash
bun run perf:k6 -- --service api
bun run perf:k6 -- --service search --profile load
```

Target dev:

```bash
bun run perf:k6 -- --target-env dev --service all
```

Useful environment variables:

- `K6_SERVICE`: `all`, `api`, `auth`, `search`, `battlelog`, `activity`
- `K6_PROFILE`: `smoke`, `load`, `stress`
- `K6_ENV`: `local` or `dev`
- `K6_*_BASE_URL`: override service base URLs
- `LOOTLOG_K6_DURATION`, `LOOTLOG_K6_RATE`, `LOOTLOG_K6_PRE_ALLOCATED_VUS`,
  `LOOTLOG_K6_MAX_VUS`: load profile tuning
- `LOOTLOG_K6_ITERATIONS`, `LOOTLOG_K6_VUS`, `LOOTLOG_K6_MAX_DURATION`: smoke
  profile tuning
- `K6_GUILD_ID`, `K6_WORLD`, `K6_BATTLE_ID`, `K6_EVENT_ID`, `K6_LOOT_ID`,
  `K6_DOC_ID`, `K6_ACTIVITY_ID`, `K6_BATTLE_CHARACTER_ID`,
  `K6_BATTLE_OPPONENT_ID`: optional fixtures for deeper routes
  Use `LOOTLOG_K6_*` for scenario execution tuning. Native k6 variables such as
  `K6_DURATION`, `K6_VUS`, and `K6_ITERATIONS` override the script's scenarios.

Dev is read-only by default. `K6_ENABLE_WRITES=true` is blocked when
`K6_ENV=dev`.

## Gateway

Run a small realtime v1 smoke test:

```bash
bun run perf:gateway
```

Useful gateway variables:

- `K6_GATEWAY_URL`, default `http://localhost`
- `K6_GATEWAY_SOCKET_PATH`, default `/ws`
- `K6_GATEWAY_CONNECTIONS`, default `1`
- `K6_GATEWAY_DURATION`, default `30s`
- `K6_GATEWAY_ORIGIN`, default `http://localhost`
- `K6_ORGANIZATION_ID`: optional organization override for presence requests
- `K6_GATEWAY_PLAYER_JSON`: optional full player payload

The gateway test connects, joins, fetches presence, and sends presence updates.
