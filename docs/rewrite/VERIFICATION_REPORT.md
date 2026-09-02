# Independent rewrite verification report

Verified: 2026-09-02

Branch: `feature/bun-effect-rewrite`

Baseline used by the rewrite: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`
Scope: complete repository, local containers, generated artifacts, workflows,
deployment definitions, and the post-migration verification brief.

## Executive summary

**Overall verdict: CODE MIGRATION COMPLETE; NOT READY FOR PRODUCTION
PROMOTION WITHOUT STAGING EVIDENCE.**

The Bun, Effect, Drizzle, generated-client, browser-boundary, Docker, realtime,
and HttpApi replacements are complete in the repository. All 244 OpenAPI
operation IDs run through HttpApi, and Discord Bot defines its three internal
operations in a local HttpApi group. API's compatibility Layers, controller
dispatcher, static route table, and adapted Promise application graph are
deleted. Battlelog and Discord Bot expose Effect application modules; Promises
remain only at actual SDK, database, Redis, R2, BullMQ, or server boundaries.

Open findings after the safe remediations in this audit:

| Severity | Count |
| -------- | ----: |
| CRITICAL |     0 |
| HIGH     |     1 |
| MEDIUM   |     0 |

The audit found and fixed three independently serious release defects: the API
image did not build in an isolated workspace, Auth's migration command could
not migrate a fresh database with the pinned Drizzle version, and CI silently
skipped the real RabbitMQ and Redis integration tests. It also corrected stale
release migration paths, dependency-gate failures, unused dependencies, and
architecture documentation that still described Socket.IO.

The `codebase-design` review shaped the completed replacement. Schema, Domain,
Protocol, Client, and Messaging remain deep modules with small interfaces that
hide contract, codec, and transport detail. Backend domain logic stays inside
each application; no generic backend package was introduced. Seams exist only
at real production/test adapter boundaries.

## Architecture matrix

The actual Turbo graph contains 25 workspaces and no internal dependency cycle.
The direction is `schema <- domain/protocol <- client/messaging <- apps`; no
service imports another service workspace or database.

| Workspace                    | Kind/runtime          | Responsibility and owned state                            | Internal dependencies                         | Verdict                                        |
| ---------------------------- | --------------------- | --------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `@lootlog/activity`          | Bun service           | Activity projection; TimescaleDB                          | domain, messaging, protocol, schema           | Effect/HttpApi; typed outbound API adapter     |
| `@lootlog/api`               | Bun service           | Core Organization domains; PostgreSQL, Redis, jobs        | datetime, domain, messaging, protocol, schema | Effect/HttpApi; direct owned adapters          |
| `@lootlog/auth`              | Bun service           | Discord identity, Better Auth, sessions; PostgreSQL/Redis | none                                          | Effect/HttpApi with raw `/idp/*` boundary      |
| `@lootlog/battlelog`         | Bun service           | Battle ingestion/statistics; PostgreSQL/R2                | battle-processor, schema                      | Effect/HttpApi; direct owned adapters          |
| `@lootlog/discord-bot`       | Bun service           | Discord synchronization/delivery; no DB                   | messaging, protocol, schema                   | Effect/HttpApi; direct Discord/Rabbit adapters |
| `@lootlog/gateway`           | Bun WebSocket service | Realtime/presence; Redis federation/Rabbit input          | messaging, protocol, schema                   | Raw boundary accepted; lifecycle sound         |
| `@lootlog/search`            | Bun service           | Rebuildable Meilisearch projections                       | messaging, protocol, schema                   | Effect/HttpApi; typed Meilisearch adapter      |
| `@lootlog/developer`         | Bun-served frontend   | Unsupported developer surface                             | ui                                            | Normal frontend                                |
| `@lootlog/docs`              | Cloudflare/static     | Product documentation                                     | none                                          | Normal edge/static app                         |
| `@lootlog/game-client`       | Browser/userscript    | Margonem runtime and UI                                   | client, domain, margonem, schema              | Normal frontend; benchmark passes              |
| `@lootlog/landing`           | Static frontend       | Product/legal content                                     | ui                                            | Normal frontend                                |
| `@lootlog/traffic-splitter`  | Cloudflare Worker     | Edge origin routing                                       | none                                          | Normal edge adapter                            |
| `@lootlog/web`               | Browser SPA           | Main product UI                                           | client, datetime, domain, schema, ui          | Normal frontend                                |
| `@lootlog/wiki`              | Cloudflare/TanStack   | Public knowledge surface                                  | client, ui                                    | Normal edge/frontend app                       |
| `@lootlog/battle-processor`  | Pure package          | Battle parsing/statistics                                 | none                                          | Correctly pure                                 |
| `@lootlog/cli`               | Bun tooling           | Environment, seed, event tooling                          | battle-processor, domain, schema              | Direct tool adapters accepted                  |
| `@lootlog/client`            | Browser-safe package  | Generated HTTP/realtime clients                           | protocol                                      | Deep browser-safe boundary                     |
| `@lootlog/datetime`          | Pure package          | Date/time values                                          | none                                          | Correctly pure                                 |
| `@lootlog/domain`            | Pure package          | Access policy/domain decisions                            | datetime, schema                              | Correctly pure; no Effect needed               |
| `@lootlog/margonem`          | Browser-safe package  | Margonem models/helpers                                   | none                                          | Correctly pure                                 |
| `@lootlog/messaging`         | Effect package        | Rabbit lifecycle/publish/consume                          | protocol                                      | Deep Effect-native adapter                     |
| `@lootlog/protocol`          | Browser-safe package  | Realtime/Rabbit contracts                                 | schema                                        | Correct contract layer                         |
| `@lootlog/schema`            | Browser-safe package  | Canonical Effect Schema codecs                            | none                                          | Correct canonical schema layer                 |
| `@lootlog/typescript-config` | Config package        | Shared TypeScript policy                                  | none                                          | Correct tooling package                        |
| `@lootlog/ui`                | React package         | Shared UI primitives                                      | none                                          | Correct frontend package                       |

There is no accidental database-owning shared package and no cross-service
database access. Search owns only a rebuildable index; Gateway owns only
ephemeral realtime state.

## Effect adoption matrix

Promise signals include tests and legitimate boundaries; their location, not
the raw count alone, determines the verdict.

| Component        | Expected                          | Observed                                                                                           | Boundary assessment                                                         | Verdict  |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| Activity         | Effect, scoped resources, HttpApi | Effect repositories/adoption, nine HttpApi operations, bounded Effect HttpClient                   | Promises stay at database, Redis, and HTTP adapters                         | Pass     |
| API              | End-to-end Effect/HttpApi         | 199 HttpApi operations and domain-owned Effect modules; compatibility graph and dispatcher deleted | Promises stay at Drizzle, Redis, Discord, BullMQ, Rabbit, and HTTP adapters | Pass     |
| Auth             | Effect; raw Better Auth only      | Effect Config/DB/Redis, five HttpApi operations, Better Auth 1.7.2, raw `/idp/*`                   | Better Auth's raw handler and SDK Promises are accepted boundaries          | Pass     |
| Battlelog        | Effect, Drizzle, HttpApi          | 26 HttpApi operations, functional Effect modules, typed failures and spans                         | Promises stay at Drizzle, Redis, R2, BullMQ, and server adapters            | Pass     |
| Discord Bot      | Effect lifecycle/messaging        | Local HttpApi group, Effect sync/delivery modules, scoped Discord/Rabbit/server                    | Discord SDK Promises stay inside timed, typed adapters                      | Pass     |
| Gateway          | Effect lifecycle; raw WS adapter  | Scoped Redis/Rabbit/server and cohesive realtime core                                              | Raw WebSocket boundary is explicit and cohesive                             | Accepted |
| Search           | Effect, HttpApi, typed adapters   | Five HttpApi operations and Effect search/index modules                                            | Meilisearch Promises stay inside a typed adapter                            | Pass     |
| Messaging        | Effect-native transport           | Scoped `acquireRelease`, typed error, Effect publish/consume                                       | One adapter hides broker detail                                             | Pass     |
| Protocol         | Pure protocol/Schema              | No Promise leakage; depends only on Schema                                                         | Browser-safe                                                                | Pass     |
| Schema           | Canonical Effect Schema           | Effect Schema codecs; no server dependencies                                                       | Browser-safe                                                                | Pass     |
| Domain           | Pure domain policy                | No Effect/I/O                                                                                      | Effect would reduce clarity                                                 | Pass     |
| Client/frontends | Normal Promise/UI                 | Browser-friendly generated/realtime APIs                                                           | Effect is not required in UI                                                | Accepted |

Servers, database pools, Redis, Rabbit, workers, and Discord clients use scoped
lifetimes. Effect interruption reaches interruptible HTTP work; non-cancellable
SDK/database Promises remain isolated at their adapter boundaries.

## Critical findings

No CRITICAL finding was validated. No cross-Organization global broadcast,
cross-service database mutation, new-database-only adoption path, or active
production-framework dependency was found.

## High findings

### H-01 — Effect migration wraps rather than replaces the old application

Status: **closed locally**.

API was replaced by vertical slices through identity/Organizations, members and
roles, settings and timers, reservations and documents, loots/kills/public
views, events, and notifications/messaging/ready-room. Each slice owns typed
Effect operations and direct Drizzle/Redis/Rabbit/BullMQ/HTTP adapters. The
legacy repositories, services, controllers, `native-data-layers.ts`, reflection
dispatcher, generated static route table, compatibility Layers, and pass-through
Promise bridges are deleted.

Battlelog's controllers now compose functional Effect modules with direct
Drizzle, Redis, R2, and BullMQ boundaries. Discord Bot's sync, delivery, Rabbit
publisher, and event callbacks likewise compose Effects directly; Discord SDK
Promises are contained in typed, timed adapters. No shared backend abstraction
package was introduced.

### H-02 — HttpApi adoption covers every declared operation

Status: **closed locally**.

API has 199 HttpApi operations in 26 groups. Deterministic local generation adds
Activity 9, Auth 5, Battlelog 26, and Search 5 with exact operation-ID checks.
Discord Bot declares health and three internal operations manually. Contract
and E2E tests exercise each new boundary. Raw routing remains only for Better
Auth `/idp/*`, Gateway WebSocket upgrade, and technical documentation files.

### H-03 — Runtime promotion evidence is incomplete

Status: **open**.

No applications were running and repository rules forbid starting them.
Therefore process-level SIGTERM, HTTP load near 1,000 requests/s, 3,000
WebSockets, and bounded soak were not run. The k6 harness exists and k6 2.0.0 is
installed; its local targets were unavailable. This is an evidence gap, not a
measured regression.

Remediation: run the harness on production-like staging and
capture latency, errors, resources, soak, and bounded shutdown with immutable
image digests.

## Medium findings

### M-01 — Outbound HTTP policy is inconsistent

Status: **closed**.

The backend source no longer calls the global `fetch` API directly. Activity's
API lookups, API's Auth, Battlelog cleanup, Discord Bot, reservation catalog,
guild icon and Maps calls, plus Gateway's Auth, permission and Margonem proof
lookups use Effect HttpClient modules with explicit deadlines, response limits,
typed failures, retry-count spans, and interruption propagation. Mutations and
single-use websocket tickets are not retried; idempotent reads have bounded
retry policies. Discord notification delivery has Effect-level deadlines and
telemetry without mutation retry, while idempotent Discord.js SDK reads use a
bounded retry adapter with the same timeout and span policy. Unit coverage
proves retry bounds, mutation non-retry, response limits, and interruption.

### M-02 — Effect observability stops at compatibility boundaries

Status: **closed locally**.

HttpApi operations use stable operation IDs as span names. Transactions,
external calls, Rabbit handlers, Discord SDK reads, and infrastructure adapters
record adapter identity and retry count without recording secrets, tokens, or
user payloads. Typed failures cross application boundaries; adapter causes are
retained for diagnostics. The compatibility boundary that previously hid work
from Effect no longer exists.

## Remediated findings

1. **Auth fresh migrations failed.** Drizzle 1 rejects the flat
   `drizzle/meta/_journal.json` format. The migration now uses the timestamped
   directory format and the adoption reader consumes that layout. Fresh,
   repeated, and existing-schema adoption runs pass.
2. **API's isolated image failed.** Its TypeScript 7 config correctly listed
   `types: ["node", "bun"]`, but API did not declare `@types/bun`. Hoisting hid
   the defect. The manifest and lockfile are fixed.
3. **CI silently skipped real integrations.** The quality job now starts
   RabbitMQ/Redis and explicitly runs retry/DLQ, two-hub federation, and
   one-time-ticket integration tests.
4. **Release summaries used deleted Prisma paths.** API and Activity now point
   to Drizzle migration directories.
5. **The dependency gate was not clean-CI executable.** Knip loaded API's
   Drizzle config without a value and scanned the vendored Effect repository.
   The gate now uses a non-routable inspection URL, excludes vendored
   workspaces, recognizes the dynamic generator, removes unused dependencies,
   and fixes one unresolved type import.
6. **Architecture evidence drifted.** Current docs now describe realtime v1
   WebSockets/Redis federation and 25 workspaces; status matches the completed
   Effect/HttpApi slices.

## Accepted deviations

- Gateway's raw Bun WebSocket adapter fits upgrade/frame/backpressure semantics.
- Better Auth retains its framework-owned raw handler under `/idp`.
- Frontends and pure domain packages do not use Effect for uniformity alone.
- Generated clients use one deterministic file per OpenAPI input.
- `@lootlog/battlelog` is the workspace while `battlelog-service` remains the
  deployment identity.
- Archived Prisma schema/SQL is immutable adoption evidence, not active runtime.
- The game client's `legacy-ui-runtime-adapter` protects Margonem compatibility;
  it is not backend migration residue.

## Legacy leftovers

No active runtime import of removed backend frameworks, ORM clients, Socket.IO, Necord, Winston,
RxJS, or deleted framework adapters was found. pnpm lock/workspace files are
absent; active scripts/workflows use Bun.

Intentional evidence remains under API legacy Prisma and archived Activity
Prisma migrations. The six project Prisma skills and their lock entries are
deleted. There is no active reference to the removed backend framework outside
immutable changelogs and no direct runtime dependency or import of that
framework or Prisma. Better Auth's pinned CLI distribution retains its upstream
optional Prisma adapter transitively; it is not imported by the application.

## HTTP compatibility

- OpenAPI parity passes: 243 baseline operations plus one realtime-ticket
  addition.
- Documents contain 244 operation IDs: API 199, Activity 9, Auth 5, Battlelog
  26, Search 5.
- Deterministic client regeneration passes.
- API forward-auth/Organization authorization and public Battlelog boundaries
  remain covered.
- Activity, Auth, Battlelog, Search, and API serve every declared operation
  through HttpApi. Discord Bot's three internal operations use a manual group.

## Database compatibility

**API:** nine Testcontainers E2E tests pass against PostgreSQL/Redis. Adoption
pins 60 tables, 600 columns, 25 enums, 166 indexes, 136 constraints, and 140
evidence hashes for 139 archived migrations; mismatch fails closed and rolls
back.

**Activity:** a fresh isolated TimescaleDB pg17 database migrated twice. It has
the `Activity` hypertable, one-day chunks, seven-day retention, and a
64-character adoption fingerprint.

**Auth:** Better Auth is pinned to 1.7.2 with transactional Drizzle and
`provider-id` identity. Real PostgreSQL 17 tests cover a fresh schema and
idempotent rerun, an untracked populated 1.6 schema with deterministic Discord
issuer backfill, and a collision that aborts before schema mutation. The
adoption fingerprint distinguishes fresh, 1.6, and already migrated 1.7
databases.

**Battlelog:** a fresh PostgreSQL 17 database migrates twice: three public
tables and seven migration records. Tests preserve the known database-to-R2
ordering/failure window.

No cross-service database access was found. Production migration still requires
backup/snapshot, fail-closed verification, and expand/contract ordering.

## RabbitMQ compatibility

Messaging centralizes connection/channel lifetime, confirms, prefetch, ack/nack,
retry headers/routing, and dead-letter behavior; Protocol owns names. Unit tests
pass.

The real broker test could not be rerun on this macOS Docker host: three clean
RabbitMQ 4 containers failed before readiness because
`/var/lib/rabbitmq/.erlang.cookie` was unreadable inside the image. No
application assertion failed. CI now runs this on Linux, but that workflow must
be green before promotion. This audit does **not** claim a fresh broker PASS.

## Realtime verification

- Socket.IO is absent from active code.
- MessagePack realtime v1 is canonical in Protocol and shared by Gateway/Web/Game Client.
- Tests cover malformed frames, correlation, reconnect/resubscribe/rejoin,
  revisions/expiry/permissions, map pings, air tags, and backpressure.
- Real isolated Redis runs passed two-hub federation and ticket
  origin/single-use/expiry.
- Server-validated logical subscriptions preserve Organization scope.

Source replacement is complete. Release still requires coordinated
Gateway/Web/Game Client cutover because realtime v1 is intentionally
incompatible with Socket.IO.

## Auth/security verification

- Discord is the only sign-in provider.
- Better Auth owns session/JWT/JWKS/provider behavior.
- API requires the trusted identity header pair; bearer input does not replace
  forward auth.
- Realtime tickets are short-lived, origin-bound, single-use, and not in query
  strings.
- Organization tests reject cross-tenant access before repository work and
  preserve hidden-resource behavior.
- No production secret/resource was read or mutated.
- Eight images run as `bun`, use `dumb-init`, have healthchecks, and Trivy
  0.74.0 found zero fixed HIGH/CRITICAL vulnerabilities.

## Test results

Passing final-tree gates:

```text
bun install --frozen-lockfile
bun run format:check
bun run deps:check
TURBO_FORCE=true bun run lint
TURBO_FORCE=true bun run typecheck
TURBO_FORCE=true bun run test
TURBO_FORCE=true bun run test:e2e
TURBO_FORCE=true bun run build
bun run http-api:generate
bun run openapi:generate
bun run client:generate
bun run openapi:parity
bun run client:check
```

Every Turbo task in the final sequence bypassed cache and passed. API E2E passed
9 tests; Activity 4, Battlelog 2, and Discord Bot 8. A second complete HttpApi,
OpenAPI, and client generation produced the same aggregate SHA-256
(`74e139d1140b4c67b71103d3ea420d080ff051c28c5cfd0dd2f200af424dd512`).

Non-blocking warnings remain in existing UI/CLI lint, Vite native config, large
frontend chunks, and Turbo outputs for typecheck-only package builds.

## Performance results

Every Game Client runtime replay stayed above the 90% gate:

| Scenario      |         Current |  Baseline |  Ratio |
| ------------- | --------------: | --------: | -----: |
| Bridge object | 5,359,917 ops/s | 5,743,948 |  93.3% |
| Bridge JSON   |    30,440 ops/s |    28,713 | 106.0% |
| NI hero       |   224,738 ops/s |   235,609 |  95.4% |
| NI 50-player  |   418,920 ops/s |   415,808 | 100.7% |
| NI crowded    |    28,673 ops/s |    31,355 |  91.4% |
| SI hero       |   201,352 ops/s |   210,775 |  95.5% |
| SI 50-player  |   408,877 ops/s |   405,783 | 100.8% |
| SI crowded    |    28,909 ops/s |    31,704 |  91.2% |

k6 HTTP/realtime harnesses were inspected, but no service listened on local
targets and applications were not started. There is no current HTTP load,
3,000-socket, process resource, or soak result; see H-03.

## Production blockers

1. Obtain green Linux CI with the mandatory real RabbitMQ, Redis, PostgreSQL,
   and TimescaleDB integrations enabled and asserted not to skip.
2. Run bounded SIGTERM, HTTP load, 3,000-WebSocket, and 30-minute soak
   verification on a
   production-like staging topology.
3. Coordinate realtime cutover with immutable images/Cloudflare artifacts and
   verify the rollback boundary.
4. Apply the Better Auth 1.7 migration only after stopping every 1.6 writer,
   taking a restorable backup, running the plan on a copy, and passing smoke
   verification. Never mix 1.6 and 1.7 writers.
5. Apply other production DB migrations only after backup/snapshot and fail-closed
   adoption checks; no production DB was touched here.

## Recommended follow-ups

1. Assert in CI that expected real integration tests did not skip.
2. Attach staging evidence and immutable image digests to the promotion task.
3. Close H-03 only after the actual bounded shutdown, HTTP, WebSocket, and soak
   checks pass; repository-local evidence cannot substitute for that run.
