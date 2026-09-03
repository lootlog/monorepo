# Bun, Effect, and Drizzle rewrite report

> Final repository implementation report. The code migration and local
> verification are complete. Use
> [`VERIFICATION_REPORT.md`](VERIFICATION_REPORT.md) for command evidence and
> the staging-only promotion blocker.

Baseline behavior is pinned to
`633f8f0157cca04ef2b609ba0e2f1903b1c28949`. The implementation ledger is
[`status.md`](status.md), and command-level evidence is summarized in
[`VERIFICATION_REPORT.md`](VERIFICATION_REPORT.md).

## Result

- Bun `1.4.0` is the package manager and backend runtime. Frozen isolated
  installs and the imported pnpm dependency-identity comparison pass.
- Effect `4.0.0-rc.112` owns backend composition, configuration, logging,
  telemetry boundaries, resources, background fibers, and graceful shutdown.
- Drizzle ORM/Kit `1.0.0-rc.4` owns database access. API and Activity migrated
  from Prisma; Auth and Battlelog use the same pinned Drizzle generation. Search
  and Discord Bot did not gain databases.
- Active runtime code contains no removed backend framework, ORM client, Socket.IO, Necord,
  Winston, RxJS, or removed framework adapter imports.
- Browser-safe Schema, Domain, Protocol, and Client packages plus the scoped
  Messaging transport replace the former Types and framework-coupled package
  graph. Obsolete micro-packages have no consumers and are removed.
- API, Battlelog, and Discord Bot application operations compose Effects
  directly. Compatibility Layers, the legacy controller dispatcher, the static
  route table, and pass-through Promise application bridges are removed;
  Promises remain at real infrastructure and SDK adapter boundaries.
- Better Auth and its Redis storage are pinned to `1.7.2`. The transactional
  Drizzle adapter uses `provider-id` identity and the account migration adds the
  deterministic Discord issuer plus the `(issuer, accountId)` uniqueness
  contract with collision preflight.

## Effect migration hardening audit

The post-rewrite audit removed the remaining migration-shaped implementation
debt rather than treating the absence of NestJS imports as sufficient:

- active RabbitMQ routes decode with canonical schemas before consumer logic;
- Battlelog no longer uses a production `ManagedRuntime` or Promise database
  facade, and its Redis/R2 boundaries use schema-backed decoders;
- Gateway lifecycle and background work compose Effects, with Promise
  conversion confined to Bun, Redis, Rabbit, BullMQ, Discord, and WebSocket
  callback boundaries;
- secrets remain `Redacted` until an external SDK client is constructed;
- semantic tagged failures are mapped to HTTP only at the transport edge;
- API Redis reads require explicit typed codecs, and Auth decodes consumed
  realtime tickets with Effect Schema; its IDP-token flow is Effect-native up
  to the Discord SDK boundary;
- rejectable infrastructure Promises use `Effect.tryPromise`, keeping failures
  in the typed error channel; the architecture gate rejects `Effect.promise`
  in production backend code;
- current-time decisions in Effect generators use `Clock`, and expected
  failures use `Effect.fail`; AST checks prevent direct wall-clock reads and
  uncaught throws from returning inside generators;
- tautological endpoint-dispatch tests that shared one mock across unrelated
  operations were removed rather than preserved as misleading coverage;
- API native composition is split into focused responsibility modules.

## Preserved contracts

- Five OpenAPI specifications contain 244 operation IDs: the 243 baseline
  operations plus the allowlisted realtime-ticket endpoint. Methods, paths,
  status codes, security declarations, public battle links, and all other
  operation IDs remain at parity.
- Orval `mode: "single"` generates one TypeScript file for each of the five API
  inputs instead of 1,176 files. Battlelog path items are normalized before
  serialization and two-pass generation is deterministic.
- API preserves the Traefik `forwardAuth` boundary. Auth validates the JWT or
  session, then API requires the complete trusted `x-auth-user-id` and
  `x-auth-discord-id` pair. Bearer authentication directly against API fails
  closed.
- RabbitMQ topology, payloads, retries, dead-lettering, and ack/nack behavior are
  preserved. A real broker test covers delivery, TTL retry, retry count, and
  DLQ routing.
- Database migrations preserve physical schemas, constraints, transactions,
  locks, and effect ordering. Existing databases are adopted only after a
  fail-closed fingerprint match.
- Better Auth remains a raw handler under `/idp` and `/idp/*`, retaining
  cookies, redirects, JWT/JWKS behavior, provider tokens, forward-auth, and the
  existing Redis fail-open boundary.
- The Battlelog workspace is `apps/battlelog` / `@lootlog/battlelog`; deployment
  identity remains `battlelog-service` for the separate infrastructure change.

## Realtime and presence

- Gateway implements the coordinated realtime v1 WebSocket protocol with
  MessagePack command, response, and event envelopes. The client exposes
  Promise request/response, push subscriptions, explicit connection state,
  reconnect with jitter, re-authentication, rejoin, and resubscription.
- RealtimeHub owns logical subscriptions, Redis federation, cross-instance
  lookup, deduplication, and bounded backpressure. Clients do not provide raw
  room names.
- Presence uses 25-second heartbeats, 60-second expiry, server `lastSeen`,
  monotonic revisions, basic versus precise-location visibility, verified
  versus reported state, and stale-state expiry.
- Game Client stores selected Organizations additively. It publishes by default
  only when an Organization matches the active Margonem clan; otherwise it does
  not publish.
- `LOOTLOG_PRESENCE_LOCATION_READ` is added with a backfill for roles that
  already held `LOOTLOG_ONLINE_PLAYERS_READ`.
- First-party clients authenticate with the session cookie. Cross-origin Game
  Client connections use a short-lived, origin-bound, one-time ticket without
  putting credentials in a query string.
- A real Redis run verifies two independent Gateway instances plus ticket
  origin, reuse, and expiry behavior.

## Database and application evidence

- API's native Bun/Effect listener serves all 26 groups and 199 operations.
  RabbitMQ consumers, BullMQ workers, scheduled jobs, data layers, and shutdown
  are scoped Effect resources. The gate passes 259 unit tests, 138 Effect
  boundary tests, and 9 real PostgreSQL/Redis E2E tests.
- API archives the legacy schema and 139 migrations with 140 checked SHA-256
  entries. Real PostgreSQL verification covers a clean baseline, adoption,
  idempotent re-entry, and rollback on fingerprint mismatch.
- Activity's legacy and Drizzle definitions match on a real TimescaleDB,
  including compound keys, indexes, one-day hypertable chunks, and seven-day
  retention.
- Battlelog passes a real PostgreSQL smoke while retaining the known
  database-to-R2 failure window. The Drizzle seed CLI was also exercised against
  PostgreSQL.
- Web, Game Client, Wiki, and generated clients use the new HTTP and realtime
  boundaries. Web passes 622 tests, Game Client 1,300, and Client 19.

## Delivery evidence

- All eight Bun image targets build as non-root images with healthchecks,
  `dumb-init`, and source maps. Recorded Trivy scans report zero fixed high or
  critical vulnerabilities.
- Wiki and Traffic Splitter Wrangler dry-runs pass without publishing or
  changing Cloudflare resources.
- The repository-wide frozen install, lint, typecheck, test, build, E2E,
  OpenAPI parity, generated-client, browser-safety, and forbidden-import gates
  pass.
- HttpApi, OpenAPI, and client outputs reproduce byte-for-byte across two
  complete generation runs. The Game Client replay remains above 90% of every
  matching baseline.
- All six project Prisma skills and their lock entries are removed. References
  and direct runtime dependencies/imports for the removed backend framework are
  absent; direct Prisma runtime dependencies/imports are also absent. Immutable
  migration evidence and changelogs remain intact.
- ADRs 0003–0008 and a normal Changeset document the runtime, contract,
  database, messaging, and realtime decisions.

## Deliberately preserved risks

- Activity keeps its existing weak deduplication behavior.
- Battlelog keeps its database-to-R2 failure window.
- Discord delivery can repeat after redelivery.
- Realtime v1 is intentionally incompatible with Socket.IO and requires a
  coordinated Gateway, Web, and Game Client rollout.

## Deployment boundary

This repository change performs no deployment and mutates no production
PostgreSQL, TimescaleDB, Redis, RabbitMQ, Meilisearch, R2, or Cloudflare
resource. The separate infrastructure pull request must consume immutable
artifacts and attach its promotion evidence, including the live 3,000-WebSocket
smoke, HTTP burst near 1,000 requests per second, short soak, and bounded
shutdown checks. See [`DEPLOYMENT_HANDOFF.md`](DEPLOYMENT_HANDOFF.md).
