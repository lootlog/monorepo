# Rewrite status

Baseline: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`.

Update this file after each checkpoint. `complete` means implementation and the listed verification both pass. A local commit is not evidence by itself.

| Slice                                           | State    | Required evidence                                                                                                        |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Baseline identity and inventory                 | complete | 30 workspaces; five OpenAPI files; 243 operation IDs; RabbitMQ, realtime, DB, jobs, env names, and key families recorded |
| Read-only baseline worktree                     | complete | `/Users/kamil/workspace/margo/lootlog-baseline` is detached at the baseline SHA and `chmod -R a-w`                       |
| Bun package manager and Turbo graph             | pending  | frozen install, graph comparison, serialized generation, CI/release scripts                                              |
| Schema / Domain / Protocol / Messaging packages | pending  | browser-safe builds, consumer migration, no framework imports                                                            |
| Generated Client replacement                    | pending  | normalized OpenAPI diff and deterministic double generation                                                              |
| Auth Effect slice                               | pending  | Better Auth HTTP/cookie/JWT/Redis parity and graceful shutdown                                                           |
| Battlelog Effect/Drizzle slice and rename       | pending  | DDL parity, fixtures, public links, R2 compensation tests                                                                |
| Search Effect slice                             | pending  | RabbitMQ/Meilisearch projection parity; no relational DB                                                                 |
| API and Discord compatible slice                | pending  | HTTP/RabbitMQ parity and cross-service tests                                                                             |
| Activity Effect/Drizzle slice                   | pending  | Timescale hypertable, one-day chunks, seven-day retention, fixtures                                                      |
| Gateway WebSocket v1                            | pending  | schema/MessagePack, federation, auth, backpressure, two-instance tests                                                   |
| Presence target model                           | pending  | heartbeat/expiry/revision/trust/location capability/backfill tests                                                       |
| Web Game client Wiki consumers                  | pending  | HTTP/realtime cutover and persisted-setting compatibility                                                                |
| Docker Cloudflare and CI                        | pending  | multi-target non-root images, shutdown, Trivy, Workers dry-runs                                                          |
| Legacy dependency cleanup                       | pending  | zero forbidden imports and zero `MIGRATION_TODO`                                                                         |
| ADRs Changeset and handoff reports              | pending  | accepted/proposed records, release note, infra handoff                                                                   |
| Final verification                              | pending  | Bun gates, E2E, integration, OpenAPI, DDL, shutdown, 3000 WS, HTTP burst, soak                                           |

## Current exceptions and risks

- Concurrent Turbo tasks can race Prisma generation. Sequential baseline gates are green.
- Activity deduplication is weak and remains a parity risk.
- Battlelog has a DB-to-R2 failure window and remains a parity risk.
- Discord notification delivery can be repeated and remains a parity risk.
- Presence is currently tied to socket lifetime and uses one capability for basic status and precise location.
- The planned realtime v1 is not wire-compatible with Socket.IO and therefore needs a coordinated Gateway, Web, and Game-client release.

## Handoff rule

Do not mark the rewrite complete while any compatibility boundary is verified only by unit tests. HTTP, RabbitMQ, database adoption, realtime federation, generated clients, graceful shutdown, and client persistence each require their dedicated acceptance evidence.
