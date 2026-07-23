# Runtime replay benchmark baseline

Recorded on 2026-07-23 with an Apple M5 Pro, Node/Vitest from the pinned
workspace, and no other benchmark configuration changes.

Command:

```bash
pnpm --filter @lootlog/game-client bench:runtime --run
```

Fixture: 50 other players, 120 NPC upserts, mixed `npcs_del`, a 50-warrior
battle packet, and fight loot. Both cases use 200 warm-up iterations and 2,000
minimum iterations.

| Payload     |    Throughput |      Mean |    RME |
| ----------- | ------------: | --------: | -----: |
| Object      | 567,284 ops/s | 0.0018 ms | ±0.22% |
| JSON string |  27,209 ops/s | 0.0368 ms | ±0.20% |

Use this file as the comparison point for subsequent runtime integration
changes. Re-run on the same machine with the same fixture and configuration.
Median throughput below 90% of the matching baseline blocks the change. The
architectural invariant tests remain authoritative for complexity regressions
that wall-clock sampling may miss.
