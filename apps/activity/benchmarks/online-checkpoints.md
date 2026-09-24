# Online checkpoint index comparison

LOO-153 removes the two `endedAt` B-tree indexes and keeps the primary key plus
`startedAt`. The measured benefit is lower write amplification. Checkpoint
frequency, ingestion SQL and history results remain unchanged.

## Reproduce

```sh
bun run --cwd apps/activity bench:online-checkpoints /tmp/online-checkpoints
```

The script provisions and removes its own PostgreSQL container. Timed operations
call the actual `OnlineRepository.ingest` and `find` methods. Results and query
plans go to the supplied directory; no existing database is read or modified.
Append `--plans-only` to skip the timed workload. Read plans capture the SQL and
parameters emitted by the real repository through Effect's statement transformer.

## Measurement on 2026-09-25

PostgreSQL 17.10 on aarch64, with a two-CPU/1-GiB container and 128 MiB shared
buffers; the Bun driver ran on the same development host without a CPU limit.
The fixture held 1,215,000 synthetic intervals: 5,000 ordinary users with 119 days
of history and one user with 20,000 intervals. Eight concurrent writers and two
readers exercised each layout after 20,000 warmup checkpoints. Each of three
measured trials wrote 40,000 checkpoints. Autovacuum was disabled for both
layouts; a database checkpoint preceded each measured trial.

| Measurement                                          |       Original indexes |       PK and startedAt |
| ---------------------------------------------------- | ---------------------: | ---------------------: |
| Mean WAL bytes/checkpoint, including tracking update |               2,560.90 |                 393.00 |
| Mean interval HOT update share                       |                     0% |                 99.90% |
| Interval index growth over 120,000 checkpoints       |        2,301,952 bytes |                0 bytes |
| Interval heap growth over 120,000 checkpoints        |        3,301,376 bytes |           49,152 bytes |
| Write p95 by trial                                   |  5.13 / 5.12 / 5.10 ms | 4.42 / 4.49 / 18.71 ms |
| Current-day read p95 by trial                        |  2.53 / 2.53 / 2.55 ms | 2.40 / 2.49 / 10.19 ms |
| Older-day read p95 by trial                          |  2.54 / 2.50 / 2.49 ms |  2.38 / 2.43 / 9.64 ms |
| 112-day read p95 by trial                            | 9.85 / 10.01 / 8.75 ms | 7.28 / 7.33 / 15.58 ms |

WAL fell by 84.65%. The third candidate trial had higher latency across writes
and reads; its cause was not established. These results do not establish a
general latency improvement or production capacity. WAL includes full-page
images after forced checkpoints, so its absolute per-checkpoint cost depends on
checkpoint cadence and storage settings.

The large-history user was measured separately after concurrent traffic, with
three warmup reads and 30 samples per range:

| Range       | Original median / p95 | PK and startedAt median / p95 |
| ----------- | --------------------: | ----------------------------: |
| Current day |       0.57 / 19.84 ms |                1.68 / 2.97 ms |
| Older day   |        2.10 / 3.61 ms |                2.00 / 3.15 ms |
| 112 days    |    224.92 / 241.82 ms |            239.23 / 261.85 ms |

Removing the end-time index trades about 1.1 ms of median current-day read time
for this synthetic large-history user against lower sustained write cost. A
`(userId, startedAt)` index cannot discard older intervals for the current-day
query: an old interval may still overlap today. No additional index was added.

On a separate fresh-fixture plan run, the ordinary user's history query used the
primary-key bitmap with 10 buffer accesses after the change. The original full
history index scan recorded 227 buffer hits. The large-history plans combined
the user and global start-time indexes; full-range aggregation still dominated
execution. These plans establish the access paths, not an end-to-end speedup.

Retention plans use `UserOnlineInterval_endedAt_idx` before the change and
`UserOnlineInterval_startedAt_idx` afterward. Both return at most 1,000 locked
candidates. After cleanup, the new selector inspected 5,001 intervals starting
exactly at the cutoff and rejected them by `endedAt` in about 4 ms. Those crossing
intervals must remain; excluding equality would leave zero-duration expired rows
undeleted.

The integration suite verifies cutoff equality, long overlaps, retries,
out-of-order delivery, concurrent retention, restart recovery, Warsaw DST,
world attribution and private-user access. Separate isolated checks verified
migration lock timeout/rollback and a checkpoint extending an expired interval
while retention waited for its lock. HTTP, RabbitMQ and production storage were
outside the benchmark.
