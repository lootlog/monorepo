# LOO-146 benchmark results

Measured locally on 2026-09-19 using the committed benchmark script. See
[the runbook](read-query-budget.md) for fixture and reproduction. This uses
100,000 narrow battles and 1,000,000 warriors, not production cardinality.

## Concurrent workload

Three alternating baseline/candidate rounds each run twenty search workers with
four searches each, ten character reads and forty insert transactions. Each mode
therefore has 240 searches, 30 metadata reads and 120 inserts. The underlying
dataset is identical and inserted records are removed after each round. Warm
caches and fixed ordering can influence results.

The SQL harness approximates two read permits and a three-second overall budget
by setting the statement timeout to the smaller of two seconds and the remaining
budget after admission/acquisition. It does not reproduce Effect interruption or
HTTP handling; integration tests cover those separately. Percentiles include
failed requests and cancellation/rollback time. Insert transactions commit a
battle and one warrior, not the complete gameplay submission workflow.

| Mode      | Operation |   N |  p50 ms |   p95 ms |   p99 ms | Pool wait p95 ms | Errors |
| --------- | --------- | --: | ------: | -------: | -------: | ---------------: | -----: |
| baseline  | search    | 240 | 8712.19 | 14003.28 | 16893.72 |         7095.444 |     10 |
| baseline  | metadata  |  30 | 1392.06 | 12713.67 | 13801.84 |         9316.184 |      0 |
| baseline  | insert    | 120 |   88.17 |  5886.89 | 10598.17 |         5790.019 |      0 |
| candidate | search    | 240 | 2120.65 |  3001.99 |  3030.52 |            0.023 |     35 |
| candidate | metadata  |  30 |    1.59 |  3001.71 |  3030.02 |            0.019 |      2 |
| candidate | insert    | 120 |    1.64 |    67.00 |    74.78 |            0.052 |      0 |

Errors by mode/operation:

- baseline search: canceling statement due to statement timeout: 10
- baseline metadata: none
- baseline insert: none
- candidate search: admission timeout: 4, canceling statement due to statement timeout: 31
- candidate metadata: admission timeout: 2
- candidate insert: none

No insert failed. The candidate protects shared pool capacity by rejecting
overloaded reads; compare the latency improvement with those failures. Baseline
statements have a ten-second safety timeout, while requests can also wait for a
connection. Client acquisition wait is measured around `pool.connect`; admission
wait is recorded separately in the round summaries.

| Mode      | Mean round elapsed ms | Mean container CPU ms | Mean effective cores |
| --------- | --------------------: | --------------------: | -------------------: |
| baseline  |               42146.1 |               21074.7 |                0.500 |
| candidate |                9487.2 |                4748.6 |                0.501 |

PostgreSQL 17.10 ran on ARM64 with an existing 0.5 CPU / 512 MiB container limit.
Settings were read only and unchanged. CPU comes from cgroup `usage_usec` and
includes all database processes. Both modes saturate this allocation; candidate
CPU savings partly come from rejecting overload. This does not establish CPU
headroom on the production database.

## Query decisions

The original search can use global name ordering and probe battles repeatedly
to find ten names for a small owner. The candidate keeps the warrior lookup
correlated to an owned battle using `OFFSET 0`. It retains matching, distinct
names, alphabetical ordering and descending text-ID selection. All eight
synthetic owner/term combinations were compared with `EXCEPT` in both directions
and returned identical results.

The heavy/common case still sorts 80,000 matching rows and spills temporary
blocks. Original global name ordering can return faster for that case. The
candidate is intended to bound work by the owner's history, not to speed up
every possible distribution. A materialized owner CTE was rejected: it could
still scan all warriors and spill while sorting.

Character metadata now reads the latest matching self warrior for each registered
character/world instead of deduplicating historical joins. Existing indexes
support this without an index migration. The shared filtered `EXISTS` barrier
also avoids global warrior scans for absent terms, at the cost of more index
buffer hits for some filtered histories. Ordinary common-term counts remain
similar. Buffer hit counts below include repeated index probes, not unique pages.

Exact SQL is in `../scripts/benchmark-reads/queries.json`.
[Raw measurements](read-query-measurements.json) retain nonexecuting plans,
analyzed plan trees with rows/buffers, repeated timings and round summaries.
The fixture omits production row width, unrelated indexes and production data
skew. These results do not establish production-cardinality or post-rollout
acceptance.

## Isolated queries (three-run medians)

| Query                    | Before ms | After ms | Before hit/read blocks | After hit/read blocks |
| ------------------------ | --------: | -------: | ---------------------: | --------------------: |
| small: search Co         |   219.591 |    1.575 |               200592/0 |                1306/0 |
| small: search Common     |   212.267 |    1.333 |               200592/0 |                1306/0 |
| small: search Rare-10001 |     0.365 |    0.790 |                 1306/0 |                1306/0 |
| small: search Absent     |     0.353 |    0.683 |                 1306/0 |                1306/0 |
| small: characters        |     0.179 |    0.073 |                  406/0 |                  81/0 |
| small: Common list       |     0.060 |    0.123 |                  115/0 |                 115/0 |
| small: Common count      |     0.086 |    0.205 |                  255/0 |                 255/0 |
| small: Absent list       |     0.176 |    0.515 |                  655/0 |                 656/0 |
| small: Absent count      |     0.174 |    0.409 |                  655/0 |                 655/0 |
| heavy: search Co         |   198.262 |  227.102 |               176078/0 |              130737/0 |
| heavy: search Common     |   198.700 |  288.902 |               176078/0 |              130737/0 |
| heavy: search Rare-10001 |   700.875 |  109.040 |              11876/380 |              130737/0 |
| heavy: search Absent     |   685.860 |  103.458 |              12067/185 |              130737/0 |
| heavy: characters        |   586.831 |    0.118 |                12731/0 |                  81/0 |
| heavy: Common list       |     0.052 |    0.093 |                  114/0 |                 114/0 |
| heavy: Common count      |     7.378 |   16.053 |                25121/0 |               25121/0 |
| heavy: Absent list       |   697.614 |   79.387 |              12148/104 |               65166/0 |
| heavy: Absent count      |   706.984 |   80.838 |                12252/0 |               65121/0 |
