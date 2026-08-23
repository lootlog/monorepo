# Runtime replay benchmark baseline

The bridge-only baseline was recorded on 2026-07-23 with an Apple M5 Pro and
the pinned workspace toolchain. The full-pipeline baseline was added on
2026-08-23 on the same machine class.

Command:

```bash
pnpm --filter @lootlog/game-client bench:runtime --run
```

To also persist p50/p95 latency and work counters as JSON Lines, provide an
explicit output path:

```bash
RUNTIME_REPLAY_METRICS_FILE=/tmp/game-client-runtime-replay.jsonl \
  pnpm --filter @lootlog/game-client bench:runtime --run
```

## Bridge-only before/after

Fixture: 50 other players, 120 NPC upserts, mixed `npcs_del`, a 50-warrior
battle packet, and fight loot. Both cases use 200 warm-up iterations and 2,000
minimum iterations.

| Payload     |    Throughput |      Mean |    RME |
| ----------- | ------------: | --------: | -----: |
| Object      | 567,284 ops/s | 0.0018 ms | ±0.22% |
| JSON string |  27,209 ops/s | 0.0368 ms | ±0.20% |

After moving parsing and routing behind the Margonem handler:

| Payload     |      Throughput |      Mean | Change |
| ----------- | --------------: | --------: | -----: |
| Object      | 5,743,948 ops/s | 0.0002 ms |  +913% |
| JSON string |    28,713 ops/s | 0.0348 ms |  +5.5% |

Use this file as the comparison point for subsequent runtime integration
changes. Re-run on the same machine with the same fixture and configuration.
Median throughput below 90% of the matching baseline blocks the change. The
architectural invariant tests remain authoritative for complexity regressions
that wall-clock sampling may miss.

## Full pipeline before refactor

This fixture uses the real NI and SI runtime adapters, the runtime bridge,
processors, the original Margonem handler seam, the applied-state
synchronizer, Zustand stores, and a React Profiler root. The anonymized replay
contains a 50-player crowded map, 120 NPCs, other-player movement, hero
movement, battle, loot, chat, NPC deletion, and notification cleanup. Timer
clock behavior is covered by deterministic hook tests because real-time
intervals would make a microbenchmark noisy.

Recorded results:

| Runtime | Scenario             |    Throughput |      Mean |       p50 |       p95 |
| ------- | -------------------- | ------------: | --------: | --------: | --------: |
| NI      | Hero movement        | 243,618 ops/s | 0.0041 ms | 0.0040 ms | 0.0045 ms |
| NI      | 50-player movement   | 410,800 ops/s | 0.0024 ms | 0.0024 ms | 0.0027 ms |
| NI      | Crowded mixed replay |  29,137 ops/s | 0.0343 ms | 0.0337 ms | 0.0364 ms |
| SI      | Hero movement        | 225,803 ops/s | 0.0044 ms | 0.0040 ms | 0.0076 ms |
| SI      | 50-player movement   | 396,785 ops/s | 0.0025 ms | 0.0024 ms | 0.0033 ms |
| SI      | Crowded mixed replay |  29,740 ops/s | 0.0336 ms | 0.0330 ms | 0.0373 ms |

The 50-player movement scenario is also a structural gate: it must record zero
game snapshots, zero normalized-other reads, zero Zustand publications, and
zero React commits for both NI and SI. Hero movement records one game-store
publication and one position-consumer commit per event. Before the refactor it
also read one Margonem game snapshot per event. The old mixed replay read the
pre-event game snapshot and 50 battle participants even when normalized data
was unchanged.

## Event-fed projection after refactor

This run uses the same NI/SI adapters, fixtures, processors, Zustand stores, and
React Profiler root. The original Margonem handler returns before the queued
projection is drained. The benchmark drains the queue inside the measured
iteration so the full Lootlog cost remains included. NPC template and icon
metadata are seeded once, matching Margonem's per-map cache behavior.

| Runtime | Scenario             |    Throughput |      Mean |       p50 |       p95 | Runtime reads/event |
| ------- | -------------------- | ------------: | --------: | --------: | --------: | ------------------: |
| NI      | Hero movement        | 235,609 ops/s | 0.0042 ms | 0.0041 ms | 0.0046 ms |                   0 |
| NI      | 50-player movement   | 415,808 ops/s | 0.0024 ms | 0.0024 ms | 0.0026 ms |                   0 |
| NI      | Crowded mixed replay |  31,355 ops/s | 0.0319 ms | 0.0314 ms | 0.0337 ms |                   0 |
| SI      | Hero movement        | 210,775 ops/s | 0.0047 ms | 0.0043 ms | 0.0080 ms |                   0 |
| SI      | 50-player movement   | 405,783 ops/s | 0.0025 ms | 0.0024 ms | 0.0027 ms |                   0 |
| SI      | Crowded mixed replay |  31,704 ops/s | 0.0315 ms | 0.0312 ms | 0.0326 ms |                   0 |

Hero movement remains intentionally observable and produces a game-store
update and React commit. Movement-only `other` packets and the settled crowded
replay produce zero store updates and zero commits. Compared with the old
full-pipeline baseline, all throughput changes stay within the 10% regression
budget; the crowded replay improves by about 7% while eliminating repeated
snapshot and participant reads.

Use the matching interface and scenario as the comparison point. Median p50 or
throughput worse by more than 10% blocks the change unless the fixture itself
was intentionally updated. These budgets track
[#1270](https://github.com/lootlog/monorepo/issues/1270). They complement, but
do not replace, the required 60-second live A/B `TaskDuration` check on the
same crowded map for NI and SI.
