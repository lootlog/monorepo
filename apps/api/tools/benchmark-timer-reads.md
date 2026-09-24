# All-Organization timer reads

`GET /timers?world=…` now executes two SQL statements instead of four. The first reads accessible Organizations and all their applicable roles through the existing access query as a CTE. The second reads timers, with the user's selected expired keys in an uncorrelated scalar subquery. A cache miss on the single-Organization path uses the same timer query and drops from two SQL statements to one.

## Reproduce

From the repository root, after installing dependencies:

```sh
bun --conditions=development apps/api/tools/benchmark-timer-reads.ts 1717850742
```

The script loads the historical production implementation directly from Git into a temporary directory, runs both implementations against a disposable migrated PGlite database, checks response parity, and prints metrics and generated SQL with `EXPLAIN (ANALYZE, BUFFERS)`. It uses no service credentials and starts no application. Temporary source files are removed on exit.

The fixture has 24 distinct users, three shared Organizations, three roles per membership, 20 active timers and two expired timers per Organization. Each user selects one expired key; there are two distinct selected-key sets. Each request returns 63 timers. The steady workload executes 96 sequential reads. The reconnect workload executes four batches of 24 concurrent reads, one per user in each batch.

## Recorded results

Local run on 2026-09-24, Bun 1.4.2. CPU includes Bun and the embedded PostgreSQL WASM engine. PGlite uses one connection; these results do not estimate native PostgreSQL CPU, network latency, whole-service throughput, or production p95/p99. Timings vary with host load and JIT warmup. There is no response-codec change.

| Workload / implementation | SQL calls | SQL rows | SQL result JSON bytes | CPU ms | p50 ms | p95 ms | p99 ms |
| ------------------------- | --------: | -------: | --------------------: | -----: | -----: | -----: | -----: |
| Sequential / before       |       384 |    7,296 |             2,692,836 | 574.44 |   2.23 |   3.17 |   3.49 |
| Sequential / after        |       192 |    6,912 |             2,495,712 | 382.31 |   1.69 |   2.08 |   2.13 |
| Reconnect / before        |       384 |    7,296 |             2,692,836 | 335.02 |  35.20 |  60.95 |  64.29 |
| Reconnect / after         |       192 |    6,912 |             2,495,712 | 206.99 |  26.10 |  34.85 |  35.61 |

Every row above returns 6,048 timer responses totaling 3,436,512 JSON bytes. SQL result bytes are serialized decoded rows, not PostgreSQL wire bytes. Before and after have zero cache hits and zero coalesced requests.

There are no overlapping requests from the same user in either workload. The sequential workload has no overlap at all. In each reconnect batch, 22 of 24 requests arrive while another request with the same Organization/world/selected-key scope is running: 88 of 96 requests, or 91.7%. This measures overlap of whole requests; it does not prove their timer SQL statements would overlap, or that they could share a result safely through a concurrent mutation.

The generated plan returns nine role rows and 63 timer rows separately, avoiding a role × timer result. The access CTE is inlined rather than materialized. The settings query is `InitPlan 1`, uses the settings index, and executes once (`loops=1`), rather than once per timer. Planner choices depend on production cardinality and statistics.

## Why query consolidation

| Candidate                                                                     | Benefit for this fixture                                                                                                                                                                                                                                                                                | Additional contract needed                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bounded in-flight sharing of a user's entire read                             | No sharing opportunity: each reconnect batch contains distinct users; steady requests do not overlap.                                                                                                                                                                                                   | Fresh access and API-key scope must still be checked; permission changes cannot reuse an earlier authorization result.                                                                                                     |
| Bounded in-flight sharing of raw timer rows after fresh access/settings reads | Potential overlap across users in reconnect batches. Under the optimistic assumption that each of the two raw scopes loads once per batch, the baseline would use 296 SQL calls instead of 384. No gain for non-overlapping reads. These are counts derived from the trace, not prototype measurements. | Key by accessible Organizations, world and selected keys; bound retained work; separate cancellation of waiters from shared work; prevent joining an older snapshot after a mutation, including across API processes.      |
| Short cache of raw timer rows with fresh access/settings reads                | Could reuse rows across sequential reads and reduce database row transfer further. An ideal two-scope cache with no expiry or invalidation during these 96 reads would use 290 baseline SQL calls. Actual hit rate and latency were not measured.                                                       | Define allowable staleness, include user-selected keys, invalidate every writer and prevent stale fills after invalidation. A whole-response cache additionally needs current membership, roles, levels and API-key scope. |
| Two SQL statements per read                                                   | Measured 192 calls in both workloads, with less result data and lower CPU/latency in this local run. Does not require overlap.                                                                                                                                                                          | Retains database reads on every request; no new cache or sharing lifecycle.                                                                                                                                                |

These bounds describe the listed designs and fixture, not a universal limit on caching. A larger Organization projection or a workload with duplicate same-user requests could have different gains. Query consolidation is the smallest measured improvement that retains the existing freshness contract. Native PostgreSQL and live deployment traces are still needed to estimate production savings.

## Freshness and verification

All-Organization reads retain no response, access decision, or timer rows after a request. Each request reads current membership, roles, Organization activity/ownership and API-key Organization scope, then current timers and user settings. Selected deleted/expired timers remain user- and world-specific; expired custom manual timers remain excluded. Owner access without a Member and the distinction between forbidden access and an accessible Organization with no timers are preserved. Concurrent permission changes have the existing request-snapshot semantics; no additional staleness window is introduced.

The existing two-second single-Organization cache, its keys, scope invalidation, and timer mutation writers are unchanged. Its loader remains lazy, including the time cutoff. Request cancellation and failure use the existing Effect/SQL lifecycle; there are no detached reads or retained failed fills.

Database tests cover role/level changes, membership deactivation/unlinking, Organization deactivation/owner changes, API-key restrictions, different users/worlds, malformed selected-key settings and create/reset/delete/restore readback. The HTTP boundary test exercises create/delete followed by both list endpoints against PostgreSQL and Redis. The Game client test uses the actual `useTimers` hook and generated HTTP client with a fake HTTP/real-time transport, exercising initial provider join, reconnect, authoritative timer events, failed refresh and recovery. Existing userscript and extension bootstrap checks remain applicable. No HTTP, RabbitMQ, WebSocket, persisted-settings or response-schema migration is required.

The remaining work per request includes two SQL executions, fresh access evaluation, timer row transfer and per-request permission filtering/response mapping. This change does not eliminate reconnects or bound the total number of simultaneous requests.
