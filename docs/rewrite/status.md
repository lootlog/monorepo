# Rewrite status

Baseline: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`.

`complete` means the implementation and its repository-owned verification pass.
Deployment and promotion evidence remains in
[`DEPLOYMENT_HANDOFF.md`](DEPLOYMENT_HANDOFF.md).

| Slice                                           | State    | Evidence                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline identity and inventory                 | complete | 30 baseline workspaces; five OpenAPI files; 243 operation IDs; RabbitMQ, realtime, DB, jobs, environment names, and key families recorded                                                                                                                                                                             |
| Read-only baseline worktree                     | complete | `/Users/kamil/workspace/margo/lootlog-baseline` is detached at the baseline SHA and read-only                                                                                                                                                                                                                         |
| Bun package manager and Turbo graph             | complete | Bun 1.4 frozen isolated install and pnpm graph parity pass; CI, release, Husky, workspace, and active-source pnpm audits are clean                                                                                                                                                                                    |
| Schema / Domain / Protocol / Messaging packages | complete | Schema, Domain, and Protocol browser-safe source exports, migrated consumers, Messaging package gates, and real RabbitMQ retry/DLQ verification pass                                                                                                                                                                  |
| Generated Client replacement                    | complete | Orval `single` mode emits five files instead of 1,176; deterministic regeneration preserves all 243 baseline operations plus the realtime ticket; 19 Bun tests pass                                                                                                                                                   |
| Auth Effect slice                               | complete | Better Auth raw handler, cookie/JWT/JWKS, Redis fail-open, HTTP parity, realtime tickets, and 20 tests pass                                                                                                                                                                                                           |
| Battlelog Effect/Drizzle slice and rename       | complete | Official Effect PostgreSQL driver, scoped lifecycle, real PostgreSQL smoke, 106 tests, build, and byte-identical OpenAPI pass                                                                                                                                                                                         |
| Search Effect slice                             | complete | RabbitMQ/Meilisearch projection parity passes and no relational database was added                                                                                                                                                                                                                                    |
| API and Discord compatible slice                | complete | API has no Nest or Prisma runtime; Bun/Effect owns all 26 groups, 199 operations, consumers, workers, jobs, data layers, and shutdown; request-scoped forward-auth and all Organization-aware authorization ports are wired; Discord delivery preserves redelivery behavior                                           |
| Activity Effect/Drizzle slice                   | complete | Real Timescale legacy-versus-Drizzle DDL diff, adoption checks, transactions, one-day chunks, seven-day retention, and 13 tests pass                                                                                                                                                                                  |
| Gateway WebSocket v1                            | complete | MessagePack, bounded backpressure, origin-bound one-time tickets, two-hub Redis federation, reconnect, resubscribe, map-ping, and air-tag tests pass                                                                                                                                                                  |
| Presence target model                           | complete | Heartbeat/expiry, monotonic revisions, verified/reported trust, precise-location permission and backfill, Organization selection, rejoin, and rebalance tests pass                                                                                                                                                    |
| Web, Game Client, and Wiki consumers            | complete | Web 610, Game Client 1,300, and Client 19 tests plus builds pass on HTTP and realtime v1; no active Socket.IO imports remain                                                                                                                                                                                          |
| Docker, Cloudflare, and CI                      | complete | Eight Bun image targets build as non-root with healthchecks and `dumb-init`; recorded Trivy scans have zero fixed high or critical findings; Wiki and Traffic Splitter dry-runs pass                                                                                                                                  |
| Legacy dependency cleanup                       | complete | Obsolete packages and framework adapters are removed; active code has no Nest, Prisma Client, Socket.IO, Necord, backend Winston/RxJS, or `nestjs-zod`; runtime-neutral direct Zod validation is retained                                                                                                             |
| ADRs, Changeset, and handoff reports            | complete | ADRs 0003–0008, the runtime/contract/presence Changeset, deployment handoff, verification report, and final report are present                                                                                                                                                                                        |
| Final verification                              | complete | Frozen install, lint, typecheck, test, build, E2E, OpenAPI parity, client check, deterministic generation, real PostgreSQL/TimescaleDB/Redis/RabbitMQ checks, image checks, shutdown coverage, forbidden-import audit, and clean Git pass; deployment load evidence is explicitly handed off as a promotion-only gate |

## Preserved risks and rollout constraints

- The legacy concurrent Prisma-generation race is eliminated from the active
  graph; archived API migration evidence is adopted through the fail-closed
  Drizzle runner.
- Activity deduplication remains weak.
- Battlelog retains its database-to-R2 failure window.
- Discord notification delivery can repeat.
- Realtime v1 is intentionally incompatible with Socket.IO and requires a
  coordinated Gateway, Web, and Game Client release.
- API trusts the identity header pair only behind Traefik `forwardAuth`, where
  Auth validates the JWT or session and strips client-supplied identity headers.
  Direct network access to API must remain unavailable.
