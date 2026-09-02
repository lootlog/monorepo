# Rewrite status

Baseline: `633f8f0157cca04ef2b609ba0e2f1903b1c28949`.

Update this file after each checkpoint. `complete` means implementation and the listed verification both pass. A local commit is not evidence by itself.

| Slice                                           | State       | Required evidence                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline identity and inventory                 | complete    | 30 workspaces; five OpenAPI files; 243 operation IDs; RabbitMQ, realtime, DB, jobs, env names, and key families recorded                                                                                                                                                       |
| Read-only baseline worktree                     | complete    | `/Users/kamil/workspace/margo/lootlog-baseline` is detached at the baseline SHA and `chmod -R a-w`                                                                                                                                                                             |
| Bun package manager and Turbo graph             | complete    | Bun 1.4 frozen isolated install and pnpm graph parity pass; CI, release, Husky, workspace, and active-source pnpm audits are clean                                                                                                                                             |
| Schema / Domain / Protocol / Messaging packages | complete    | browser-safe source exports, consumer migration, and package gates pass                                                                                                                                                                                                        |
| Generated Client replacement                    | complete    | Orval `single` mode emits five files instead of 1,176 for five OpenAPI inputs; deterministic regeneration preserves all 243 baseline operations plus the realtime ticket; 19 tests pass                                                                                        |
| Auth Effect slice                               | complete    | Better Auth raw handler, cookie/JWT/JWKS, Redis fail-open, HTTP parity, and 20 tests pass                                                                                                                                                                                      |
| Battlelog Effect/Drizzle slice and rename       | complete    | Official Effect PostgreSQL driver, scoped lifecycle, real PostgreSQL smoke, 106 tests, build, and byte-identical OpenAPI pass                                                                                                                                                  |
| Search Effect slice                             | complete    | RabbitMQ/Meilisearch projection parity passes and no relational DB was added                                                                                                                                                                                                   |
| API and Discord compatible slice                | in progress | Discord is complete; API source and E2E query layers are Prisma-free; the Effect/Bun composition root covers all 26 groups and 199 operations; request-scoped Traefik forward-auth and four identity-only ports are wired; 194 protected and 5 public operations are preserved |
| Activity Effect/Drizzle slice                   | complete    | real Timescale legacy-vs-Drizzle DDL diff, adoption checks, transactions, and 13 tests pass                                                                                                                                                                                    |
| Gateway WebSocket v1                            | complete    | MessagePack, bounded backpressure, one-time origin-bound tickets, two-hub Redis federation, reconnect, map-ping, and air-tag tests pass                                                                                                                                        |
| Presence target model                           | complete    | heartbeat/expiry, monotonic revisions, verified/reported trust, location permission/backfill, selection, rejoin, and rebalance tests pass                                                                                                                                      |
| Web Game client Wiki consumers                  | complete    | Web 610, Game Client 1,300, and client 19 tests plus builds pass on HTTP and realtime v1; no active Socket.IO imports remain                                                                                                                                                   |
| Docker Cloudflare and CI                        | in progress | Bun Auth, Activity, Gateway, Search, Discord Bot, and Developer images build non-root; verified Trivy scans are clean; Wiki and Traffic Splitter dry-runs pass; full image matrix remains                                                                                      |
| Legacy dependency cleanup                       | in progress | obsolete domain packages, API Helpers, Socket.IO parser, and API Prisma runtime/tooling removed; CLI seed is Prisma-free and real-PostgreSQL verified; Nest awaits API host cutover                                                                                            |
| ADRs Changeset and handoff reports              | in progress | ADRs 0003-0008 added; Changeset and final handoff reports remain                                                                                                                                                                                                               |
| Final verification                              | in progress | API unit 1,060/1,060 and real PostgreSQL/Redis E2E 95/95 pass; remaining integration, OpenAPI, DDL, shutdown, 3000 WS, HTTP burst, and soak gates are pending                                                                                                                  |

## Current exceptions and risks

- The legacy baseline had a concurrent Prisma-generation race. The API no longer
  consumes generated Prisma code, and its archived schema and migration evidence
  are adopted through the fail-closed Drizzle runner.
- Activity deduplication is weak and remains a parity risk.
- Battlelog has a DB-to-R2 failure window and remains a parity risk.
- Discord notification delivery can be repeated and remains a parity risk.
- Full API E2E reruns exposed an intermittent one-second `TRUNCATE` timeout in
  the Timers suite (93/95 and 94/95); the isolated Timers file passes 29/29.
- Realtime v1 is not wire-compatible with Socket.IO and therefore needs a coordinated Gateway, Web, and Game-client release.
- API trusts `x-auth-user-id` and `x-auth-discord-id` only behind Traefik
  `forwardAuth`, where Auth validates the JWT/session and strips client-supplied
  identity headers. Direct network access to the API must remain unavailable.

## Handoff rule

Do not mark the rewrite complete while any compatibility boundary is verified only by unit tests. HTTP, RabbitMQ, database adoption, realtime federation, generated clients, graceful shutdown, and client persistence each require their dedicated acceptance evidence.
