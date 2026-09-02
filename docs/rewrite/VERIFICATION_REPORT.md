# Rewrite verification report

Last updated: 2026-09-02  
Baseline: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`  
Rewrite branch: `feature/bun-effect-rewrite`

## Verdict

The repository rewrite is complete. Bun owns backend execution and package
management, Effect owns backend composition and lifecycle, service databases use
Drizzle, and active runtime code no longer depends on Nest, Prisma, Socket.IO,
Necord, Winston, or RxJS. The generated HTTP client uses one file per OpenAPI
input.

Production deployment, infrastructure changes, and the coordinated realtime
cutover are intentionally outside this repository change. Their promotion-only
evidence is listed in [`DEPLOYMENT_HANDOFF.md`](DEPLOYMENT_HANDOFF.md).

## Contract evidence

- The normalized OpenAPI comparison preserves all 243 baseline operations. The
  only allowlisted addition is the realtime-ticket operation.
- The five documents contain 244 operation IDs: API 199, Activity 9, Auth 5,
  Battlelog 26, and Search 5.
- API accepts only the complete trusted `x-auth-user-id` and
  `x-auth-discord-id` pair produced by Traefik `forwardAuth`. Auth validates the
  session or JWT; a bearer token sent directly to API is insufficient.
- Orval `mode: "single"` emits five generated TypeScript files instead of the
  previous per-operation tree. Two consecutive generations produce identical
  hashes and leave Git clean.
- RabbitMQ exchanges, routing keys, retry queues, dead-letter queues, payloads,
  and acknowledgement behavior are preserved. A real RabbitMQ test verifies
  initial delivery, TTL retry, retry count, and dead-lettering.
- Realtime v1 covers MessagePack decoding, unknown and malformed frames,
  origin-bound one-time authentication tickets, reconnect and resubscription,
  bounded backpressure, permission rebalance, presence expiry, map pings, and
  air tags. A real Redis test verifies two independent Gateway hubs and ticket
  origin, reuse, and expiry behavior.

## Runtime and database evidence

- API uses a native Bun/Effect HTTP listener for all 26 groups and 199
  operations. RabbitMQ consumers, BullMQ workers, scheduled jobs, data layers,
  and shutdown are scoped Effect resources; no Nest application context is
  created.
- API passes 337 unit tests, 136 Effect boundary tests, and 9 real PostgreSQL and
  Redis E2E tests. Its active queries and test harness are Prisma-free.
- The API migration runner verifies 140 SHA-256 entries for the archived legacy
  schema and 139 migrations. Real PostgreSQL tests cover baseline installation,
  legacy adoption, idempotent re-entry, and rejection with rollback for a
  mismatched catalog.
- Activity's legacy and Drizzle schemas match mechanically on TimescaleDB,
  including keys, indexes, one-day chunks, and seven-day retention. Positive
  and negative adoption checks pass.
- Battlelog's Drizzle path passes a real PostgreSQL smoke test while preserving
  the existing database-to-R2 ordering and failure window.
- The local seed CLI uses Drizzle and was exercised against PostgreSQL for
  organizations, roles, members, and timers.

## Repository gates

The final tree passes:

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
bun run openapi:parity
bun run client:check
```

Backend and runtime-neutral packages use `bun:test`. Vitest remains only in the
Vite, DOM, Cloudflare, coverage, or benchmark workspaces: Docs, Game Client,
Landing, Traffic Splitter, Web, Wiki, and UI.

All eight Bun image targets build as non-root images with healthchecks,
`dumb-init`, and source maps. Recorded Trivy checks report no fixed high or
critical vulnerabilities. Wiki and Traffic Splitter Wrangler dry-runs pass
without publishing.

## Cleanup audit

- No active application, package, or tool source imports Nest, Prisma Client,
  Socket.IO, Necord, Winston, RxJS, or the removed internal adapters.
- `nestjs-zod` and its DTO adapter are removed. Direct Zod use remains only as a
  framework-neutral validation and codec implementation.
- The removed packages have no active consumers: Types, Nest Shared, API
  Helpers, Socket Parser, Access Policy, Loot Visibility, Reservations, and
  Scoring.
- The legacy migration-marker audit returns no matches outside vendored
  repositories.

## Promotion-only evidence

The repository contains the performance harness and deployment instructions,
but this rewrite did not start deployed applications or use production
credentials. The infrastructure rollout must attach a 3,000-WebSocket smoke,
an HTTP burst near 1,000 requests per second, a short soak, immutable image
digests, and bounded shutdown evidence. These are promotion checks, not missing
rewrite implementation.

## Preserved risks

- Activity deduplication remains weak.
- Battlelog retains the database-to-R2 failure window.
- Discord notifications can be delivered more than once.
- Realtime v1 intentionally requires a coordinated Gateway, Web, and Game
  Client cutover.
