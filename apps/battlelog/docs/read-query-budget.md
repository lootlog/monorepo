# Battlelog catalog query budget (LOO-146)

Catalog reads share two execution permits per Battlelog process. Each admitted
read runs in a transaction with `statement_timeout = 2000ms`; the Effect deadline
is 3000ms including admission and connection acquisition. The SQL setting is
transaction-local, so it cannot leak to ingestion through PgBouncer. Metadata
cache hits acquire neither a permit nor a database connection. Failures propagate
through the existing HTTP error handling; no status or response schema changes.

The application pool remains at ten connections, now explicit rather than using
the driver's default. Search, character/world metadata and paginated list/count
reads share the same governor. This limits these readers to two connections;
it does not reserve the remaining eight against unrelated analytics, workers or
other replicas. Broader analytics admission and workload changes belong to
LOO-111. Do not increase replicas or pool sizes to compensate for slow reads.

## Query changes

Warrior search starts from the user's battles and performs indexed warrior
lookups. `OFFSET 0` prevents PostgreSQL from flattening the lateral subquery into
a global name-index scan. Matching still uses the trimmed `ILIKE` pattern,
including SQL wildcards; distinct names remain case-sensitive, ordered by name,
with the greatest text warrior ID selecting the metadata and a ten-result limit.
There is no history truncation or new search index.

The shared warrior `EXISTS` predicate uses the same optimization barrier, covering
list filters and its analytics callers. Predicates and exact counts are unchanged.
A failed filtered count is no longer immediately retried with the same expensive
query. Character metadata starts from registered user characters and reads the
latest matching self warrior per owner, character and world. The self-warrior
join stays inside `LIMIT 1`, preserving the last known values when a newer battle
has no matching warrior. Characters without matching battles retain null values.

These barriers favor work proportional to the selected battle history over
scanning unrelated warriors. They can increase latency for large owners with
common matching names; this is a measured trade-off, not a universal speedup.
The governor bounds that remaining work. A materialized owner CTE was rejected
because it could still scan the whole warrior table and spill during sorting.

## Cancellation verification

Run from `apps/battlelog` with Docker available:

```sh
bun run test:integration
bun run test
bun run typecheck
bun run lint
```

The integration suite uses real PostgreSQL and Redis and an isolated PgBouncer
in transaction-pooling mode. It verifies SQL timeout, overall Effect deadline,
an authenticated Battlelog HTTP request aborting active SQL, no orphaned backend
query, connection reuse, and restoration of `statement_timeout` after rollback.
The abort test waits for the query to appear in `pg_stat_activity` before aborting.
A single available connection makes leaked connections observable.

Integration tests preserve search selection, owner isolation, metadata across
worlds and filtered list counts. The real HTTP boundary returns 200 for twenty
concurrent searches and 201 for a concurrent battle submission and its retry,
with one durable battle and its warriors. They use the actual database and Redis;
R2 is the fake external boundary. The count regression fails against the original code and
passes after removing the redundant retry.

The 3s deadline initiates interruption; it is not an unconditional wall-clock
response guarantee. The native Effect PostgreSQL driver waits for cancellation
and connection cleanup. An unavailable cancellation channel can add approximately
10s (connect/drain timeouts). The server's independent 2s statement timeout still
stops the active SQL. Production network failures and the deployed PgBouncer
configuration need the rollout checks below.

## Reproduce the measurements

[Measured results](read-query-measurements.md) include p50/p95/p99 request latency,
connection waits, CPU, failures and query plans on the same synthetic dataset.
[Raw measurements](read-query-measurements.json) retain analyzed plan trees,
rows/buffers, repeated timings and individual round summaries. This benchmark
uses 100,000 narrow battles and 1,000,000 warriors with skewed ownership; it is
not a production-sized reproduction. The SQL concurrency harness approximates
admission and deadlines; the integration tests above exercise actual Effect
and HTTP cancellation separately.

From the repository root, create a separate database on a local PostgreSQL
container. Database creation fails if the name exists; inspect it before reuse.
Do not run the workload against an application or production database.

```sh
docker exec battle-log-db sh -c 'createdb -U "$POSTGRES_USER" loo146_bench'
docker exec -i battle-log-db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d loo146_bench' < apps/battlelog/scripts/benchmark-reads/fixture.sql
BENCH_DATABASE_URL="$YOUR_DISPOSABLE_DATABASE_URL" BENCH_CONTAINER=battle-log-db bun apps/battlelog/scripts/benchmark-reads/run.mjs
```

Set `BENCH_DATABASE_URL` to that disposable database's local connection URL.
The harness rejects other database names, reads no container credentials and
writes results to `/tmp/loo146-benchmark` (override with `BENCH_OUTPUT_DIR`).
It checks nonexecuting plans before running `EXPLAIN ANALYZE` with a 10s SQL
budget. `BENCH_CONTAINER` enables read-only cgroup CPU measurement; omit it
when the database is not in Docker. The workload never changes container limits.
After inspecting results, remove only the disposable database:

```sh
docker exec battle-log-db sh -c 'dropdb -U "$POSTGRES_USER" loo146_bench'
```

## Rollout and rollback

No migration, new index, backfill, database setting or PgBouncer setting is
required. Existing battle and warrior indexes support the queries, so there is
no index-build I/O, additional index storage or migration lock impact. Read
transactions hold ordinary access-share locks until completion/cancellation.
The schema, submission constraints and public battle links remain compatible.

1. Reproduce the benchmark on an isolated copy with production-like row widths,
   owner skew and approximately 9.2M battles / 31.9M warriors. Capture nonexecuting
   plans first, then bounded analyzed plans. The local synthetic workload alone
   is not evidence at production cardinality.
2. Deploy the already-built immutable application artifact to a canary without
   increasing replicas. Keep the current PgBouncer settings and pool capacity.
   Count the admission limits across all active replicas; two permits are per
   process, not a cluster-wide limit.
3. During a representative peak window compare search/list/metadata and ingestion
   p50/p95/p99, HTTP errors, active-query age, database CPU, I/O waits and connection
   acquisition waits against the incident baseline. Confirm no catalog query
   accumulates for minutes and no read-induced ingestion acquisition failures.
   Record completed and timed-out requests separately; do not hide shedding in
   successful-request percentiles.
4. Verify client disconnects on the deployed HTTP and PgBouncer path, including
   metadata cache misses. Keep a budget on diagnostic SQL. Do not run unbounded
   `EXPLAIN ANALYZE` against production.
5. If ingestion degrades or catalog failures are unacceptable, route back to the
   previous immutable deployment. No schema rollback is needed. The previous
   version restores unbounded catalog reads, so observe query accumulation during
   rollback; retain incident mitigation rather than increasing database concurrency.

The production-cardinality reproduction, deployment and post-rollout peak-window
comparison are outstanding. No production configuration or data was changed by
this implementation.
