# Lootlog architecture

This document describes the current system and the target contracts that guide
changes. It does not claim that every target contract is implemented. Known
gaps are listed explicitly.

Read [`PRODUCT.md`](PRODUCT.md) for product direction, [`CONTEXT.md`](CONTEXT.md)
for domain language, and [`SECURITY.md`](SECURITY.md) for mandatory security
rules. Accepted cross-cutting decisions are indexed in
[`docs/adr/README.md`](docs/adr/README.md).

## System flow

The main loop is:

```text
Margonem runtime
  -> game client observers and processors
  -> HTTP APIs and the realtime v1 WebSocket gateway
  -> PostgreSQL / TimescaleDB / R2
  -> RabbitMQ domain and delivery events
  -> gateway, activity, search, Discord, and web consumers
```

The game client is the source of supported live observations. The web app is
the main surface for durable records, analysis, configuration, and complex
organization operations.

## Deployable applications

| Workspace                   | Responsibility                                                                                                       | Primary state or dependency           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `@lootlog/api`              | Organizations, members, loot, kills, timers, reservations, chat, notifications, events, documents, and configuration | Lootlog PostgreSQL, Redis, RabbitMQ   |
| `@lootlog/auth`             | Discord sign-in, sessions, JWT/JWKS, provider tokens                                                                 | Users PostgreSQL, Redis, Better Auth  |
| `@lootlog/gateway`          | Realtime v1 WebSocket authentication, subscriptions, presence, and real-time fan-out                                 | Redis federation, RabbitMQ            |
| `@lootlog/battlelog`        | Battle ingestion, storage, retrieval, and statistics                                                                 | Battle PostgreSQL, R2                 |
| `@lootlog/activity`         | Durable organization activity and audit records                                                                      | TimescaleDB                           |
| `@lootlog/search`           | Public item, NPC, and player search projections                                                                      | Meilisearch                           |
| `@lootlog/discord-bot`      | Discord membership synchronization, notifications, and commands                                                      | Discord, API, RabbitMQ                |
| `@lootlog/game-client`      | Margonem runtime integration and in-game UI                                                                          | Browser runtime, APIs, gateway        |
| `@lootlog/web`              | Authenticated personal and organization web app                                                                      | Generated API client, gateway         |
| `@lootlog/landing`          | Product introduction and legal pages                                                                                 | Static TanStack Start client output   |
| `@lootlog/docs`             | User documentation                                                                                                   | Static TanStack Start client output   |
| `@lootlog/traffic-splitter` | Shared edge routing for `dev.lootlog.pl` and `lootlog.pl`                                                            | Cloudflare Workers and static origins |
| `@lootlog/wiki`             | Public Margonem knowledge and search                                                                                 | Search API                            |
| `@lootlog/developer`        | Future developer surface; currently not a supported product                                                          | Static frontend                       |

Packages contain generated clients, browser-safe contracts and domain logic,
realtime and RabbitMQ protocols, scoped messaging transport, battle processing,
Margonem models, UI, configuration, and CLI tools. A package does not own data
merely because it defines a shared type.

## Data ownership

Each data domain has one writer:

- Auth owns users, sessions, and provider connections.
- API owns organizations, membership projections, access configuration, global
  loot facts, Organization Loot records and their submissions, kills, timers,
  coordination, chat, notifications, and documents.
- Battlelog owns battle payloads and derived battle statistics.
- Activity owns durable activity and audit projections.
- Search owns rebuildable public search indexes.
- Gateway owns only live connection state. Presence is ephemeral and must not
  become an unacknowledged system of record.

Other services use versioned APIs or events. They do not read or write another
service's database. Redis caches and Meilisearch indexes are rebuildable and
must never be the only copy of durable facts.

## Identity and organization boundary

Discord is the only supported sign-in provider. Domain records reference an
internal Lootlog user identifier; Discord identifiers belong to the identity
connection and Discord integration boundary.

The persisted `Guild` concept represents a Discord guild and the corresponding
Lootlog Organization. One Organization may contain several Margonem clans and
worlds. Organization membership and role membership come from Discord. Lootlog
maps Discord roles to Access policies.

The Organization is the top-level tenant boundary. A request, background job,
queue consumer, cache key, socket room, aggregate, search projection, and
notification must preserve that boundary.

## Access contract

The target authorization decision combines:

1. current Organization membership;
2. Discord roles mapped to Lootlog Access policies;
3. the capability required by the operation;
4. resource visibility, including NPC selectors and level ranges;
5. optional world, clan, event, or channel scope.

The same visibility predicate applies to raw records, derived aggregates,
search results, comments, history, socket events, and notifications. Mutation
permissions add to visibility; they do not bypass it. `OWNER` is the recovery
authority. Administrative capability alone does not imply access to all
strategic data.

Loot drops and their item, NPC, player, and allocation facts are global and
immutable across Organizations. A physical Organization Loot record is the
tenant-owned visibility, archive, comment, submission, and future settlement
boundary. A loot is visible only when it has an active Organization Loot record
and every associated NPC is covered by at least one complete role grant. The
same rule is shared by list, detail, aggregate, comment, websocket, and
watched-item notification paths.

The public guild stats card is an explicit, Organization-configured publication
of aggregate counts. Enabling it declassifies only those counts; it does not
make the underlying Loot records or their metadata public.

## Durable delivery

Durable ingestion uses idempotent identifiers where a client can retry. A
successful acceptance means the service owns delivery or durable storage. Queue
consumers tolerate redelivery and temporary reordering. Event schemas are
versioned when independently deployed producers and consumers cannot change in
one atomic release.

Events describe facts owned by their producer. Consumers update their own
state. They do not use events as permission to mutate another domain's tables.

## Reservation calendars

API is the sole writer for reservation records, personal spot pins, reminder
jobs, and reservation calendar partnerships. Reservation writes derive the
author from the authenticated internal user, normalize time to UTC, validate
the Organization's time policy, and check collisions inside a serializable
transaction. Reads are bounded by an explicit window; retention is handled by
scheduled cleanup rather than a read-side mutation or full-calendar cache.

An active calendar partnership extends visibility to one direct partner while
keeping each Organization's availability, collision checks, source ownership,
and moderation independent. It is reciprocal and non-transitive. The detailed
disclosure and revocation contract is recorded in
[ADR 0001](docs/adr/0001-direct-reciprocal-reservation-sharing.md).

Reservation reminders reuse the notification domain. A reservation stores an
offset, not a Discord identifier. The notification boundary resolves an active
DM target and creates an idempotent scheduled job. Reservation deletion cancels
pending jobs. API publishes a PII-free versioned invalidation with an explicit
audience list; gateway fans it out to each authorized Organization room while
the legacy event remains accepted during the coordinated rollout.

## Real-time delivery and presence

Gateway authenticates realtime v1 WebSocket connections before accepting
logical subscriptions. Subscription membership and per-event checks enforce
the same Organization and visibility rules as HTTP. Redis pub/sub and ephemeral
keys federate gateway instances; they do not make live state durable.

The target Presence model includes:

- explicit selected Organizations with a safe current-clan default;
- separate basic-status and precise-location capabilities;
- heartbeat, expiry, `lastSeen`, and snapshot revision semantics;
- verified and reported trust levels;
- degraded UI when a viewer lacks presence data or state is stale.

A Margonem proof remains optional. Its absence cannot disable core coordination
when the upstream service is unavailable.

## Game-client runtime boundary

The game client observes supported Margonem behavior without changing inbound
or outbound data, callbacks, object identity, exceptions, return values, or
player decisions. Margonem globals stay behind explicit runtime adapters.

Client work is bounded. Closed UI does not continue expensive rendering or
derived work. Under pressure, supporting refreshes and visual effects may
degrade before event capture, chat, notifications, or timers. Replay benchmarks
compare runtime-sensitive changes against a recorded baseline.

Tampermonkey is the current installation method. The planned Chrome extension
must use the same product core, protocols, settings, and compatibility suite.

## Public API boundary

Current OpenAPI documents and generated clients are internal deployment
contracts. They are not yet a supported third-party API.

The public API launches only with versioning, scoped personal and organization
credentials, rotation and revocation, audit history, pagination, rate and cost
limits, examples, and a compatibility policy. Public endpoints expose only
explicitly public data. Organization integrations cannot exceed the access of
their configured service account.

## Deployment

Managed production uses immutable source revisions:

- containerized services are promoted through GitOps and rolled out by ArgoCD;
- container images use `sha-<commit>` tags;
- Cloudflare applications build and deploy in one approved release run;
- the infrastructure repository records the deployed image references and
  Cloudflare deployment IDs;
- production rollback restores the previous recorded state without rebuilding.

The `@lootlog/traffic-splitter` route table serves `dev.lootlog.pl` and
`lootlog.pl` through separate Cloudflare Workers and origin sets. Merges to
`main` deploy only the Wrangler `develop` environment. Production uses the
top-level environment and changes only after release approval. Landing and Docs
generated assets use the distinct `/landing-assets` and `/docs-assets`
namespaces; Web continues to own `/assets`. The route table retains
referer-based routing for cached pre-migration `/assets` documents and accepts
legacy `/_next` assets during coordinated rollouts. Landing and Docs legacy
assets are redirected into origin-tagged aliases; cached untagged parents are
identified with HEAD probes against only the three configured origins.

Production deploys the traffic splitter before other Cloudflare targets. A
partial failure rolls applications back in reverse order. Both Workers'
Wrangler configuration in this repository remains the source of truth for
their custom domains.

Docker Compose supports local infrastructure. `docker-compose.prod.yml` is not
a supported production model and should be retired or clearly marked legacy.
Self-hosting remains community-supported until a tested distribution exists.

## Service-boundary rule

An independently deployed service must justify at least one of these costs:

- independent scaling or latency profile;
- failure isolation;
- exclusive ownership of distinct data;
- different security boundary;
- independent release or external-integration lifecycle.

Do not add a service merely because code belongs to a new domain module. The
current service set is subject to a deliberate consolidation audit after core
performance and authorization work.

## Quality gates

Each workspace declares `lint`, `typecheck`, and `test`, or documents why a gate
does not apply. Root CI must prove which gates it executes.

Critical paths require contract and end-to-end coverage across game capture,
HTTP ingestion, queues, gateway fan-out, and client consumption. Runtime changes
also require characterization tests and replay benchmarks. Generated API clients
are checked against the current OpenAPI sources.

Protected compatibility boundaries are:

- Margonem runtime behavior;
- deployed API, RabbitMQ, and websocket contracts;
- persisted data and migrations;
- userscript configuration and stored preferences;
- public battle links.

Breaking these contracts requires an explicit migration or coordinated rollout.
Unreleased experiments and internal TypeScript or UI interfaces do not receive
compatibility by default.

## Known gaps

The target contracts above expose current work rather than hiding it:

- timer visibility is not applied consistently to all search, aggregate,
  comment, history, and mutation paths;
- some timer action permissions differ between the UI/types and backend checks;
- presence is socket-lifetime state without the target heartbeat, expiry, and
  snapshot contract;
- precise location and basic online state currently share one capability;
- Discord proof is optional and availability is not represented as product
  state;
- web tests exist but the workspace does not declare a `test` script;
- `docker-compose.prod.yml` does not represent managed production;
- developer portal is a placeholder rather than a supported API product.

Treat each gap as migration work. Do not document a target behavior as already
implemented in user-facing guides until its code and verification exist.
