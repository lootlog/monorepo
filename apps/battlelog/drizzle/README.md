# Battlelog database migrations

Maintain `src/database/schema.ts` directly. Run `bun run db:generate` to derive
SQL migrations and Drizzle snapshots from it, review the artifacts, then apply
them with `bun run db:migrate:deploy`. Keep historical SQL and snapshots;
database introspection must not overwrite the source schema. The deploy command
initializes empty databases and applies only pending migrations to databases
already tracked by Drizzle.

## Warrior search indexes

Before applying `20260920142519_warrior_search_covering_indexes` to a populated
database, build the indexes below sequentially, outside a transaction. Ordinary
index creation blocks battle writes; Drizzle runs migrations in a transaction
and cannot use `CONCURRENTLY`. The migration rejects missing indexes on populated
tables and rejects invalid or mismatched existing indexes. Empty databases need
no prebuild.

```sql
CREATE INDEX CONCURRENTLY "battle_warriors_battleId_name_id_idx"
ON "battle_warriors" ("battleId", "name", "id" DESC NULLS LAST);

CREATE INDEX CONCURRENTLY "battles_userId_id_idx"
ON "battles" ("userId", "id");
```

Wait for each command to finish before starting the next. Monitor battle write
latency during the builds. Verify that both indexes are valid and their columns
and ordering match the commands above:

```sql
SELECT indexrelid::regclass AS index_name, indisvalid,
       pg_get_indexdef(indexrelid) AS definition
FROM pg_index
WHERE indexrelid IN (
  to_regclass('"battle_warriors_battleId_name_id_idx"'),
  to_regclass('"battles_userId_id_idx"')
);
```

The query must return two rows with `indisvalid = true`. If a concurrent build
fails, inspect its index first. Drop only the failed, invalid index with
`DROP INDEX CONCURRENTLY "index_name"` outside a transaction, then rerun its
creation command. Resolve a mismatched definition before proceeding; do not use
`IF NOT EXISTS` to hide it.

Run `bun run db:migrate:deploy` from `apps/battlelog`, then deploy the updated
service. Keep these additive indexes when rolling back the application: both
versions can use the existing schema, and no battle records require conversion.

### Local measurements (LOO-159, 2026-09-20)

The query builds the owner's battle-ID array in PostgreSQL, scans only IDs and
names from the covering indexes, selects ten distinct-name representatives, then
loads their metadata by primary key in the same statement. The array grows with
the owner's history; the ten-result limit does not bound its allocation. Keep
checking plans for larger histories and after PostgreSQL upgrades.

Verification used a local PostgreSQL 17 copy with 8.86 million battles and
32.41 million participants, 512 MiB container memory and 128 MiB shared buffers.
The three largest histories contained 35,629, 23,743 and 21,357 battles. This copy
has schema differences from production and runs on local hardware, not the
shared VPS. No production load was generated.

At a temporary 1-CPU container limit, nine sequential searches (common substring,
no match and two-character substring) ran alongside five synthetic battle
transactions per second, each inserting four participants:

| Measurement              | Previous query | Batched query |
| ------------------------ | -------------: | ------------: |
| Search median            |       2,072 ms |        972 ms |
| Search range             | 1,859–2,580 ms |  751–1,062 ms |
| Concurrent write p95     |        7.87 ms |       8.64 ms |
| Concurrent write maximum |       27.17 ms |      13.06 ms |

Both query variants had the new indexes available, so this comparison isolates
the query change and understates the combined improvement over the original
schema. The previous query ran without its timeout to measure completion; the
updated service used the unchanged 2-second SQL / 3-second request budget.
All 138 committed synthetic battles were present before fixture cleanup. Two
simultaneous searches for the largest owners completed in 1,137 and 1,088 ms.
The container's original 0.5-CPU limit was restored afterward.

On the 0.5-CPU copy, no-match, common, rare-match and two-character queries
returned exactly the same rows and metadata as the previous query, including
checks after evicting PostgreSQL buffers through unrelated reads. The OS cache
was retained. Repeated reads fell from about 75,000 to 32,000 PostgreSQL buffer
pages; these are not necessarily physical disk reads. Plans used one participant
index-only scan instead of 35,629 lateral scans, with at most ten metadata
lookups. Typical measured executions were 0.6–1.4 seconds, but one common-term
repeat reached 4.6 seconds, and two simultaneous large searches hit the
2-second budget. These results do not qualify a 0.5-CPU allocation or the target
VPS; repeat the capacity checks on the intended deployment before resizing.

The indexes occupied approximately 731 MiB (battles) and 2,760 MiB (participants).
An independent, disposable PostgreSQL 17 test alternated six rounds of synthetic
writes, with 100 warmups and 200 measured transactions per round. Adding the
indexes increased write p50 from 2.763 to 2.820 ms and p95 from 3.145 to 3.257 ms;
WAL rose from 11,838 to 12,893 bytes per battle (+8.9%). This small, sequential
fixture measures incremental index cost, not production throughput.

## Object cleanup

Apply `20260904192453_pending_object_deletions` before deploying the Battlelog
cleanup worker. Removing a battle and recording its object deletion intent
commit in one database transaction. The record and public link disappear
immediately; object storage cleanup can complete later.

The worker polls every five seconds, processes at most 100 records with four
concurrent deletions, and retries failures after one minute. It invalidates
analytics and removes the R2 object before deleting the intent. Repeated
deletion of an already absent object is safe.

Inspect pending cleanup without loading battle payloads:

```sql
SELECT "battleId", "userId", "createdAt", "retryAt"
FROM "battle_object_deletions"
ORDER BY "retryAt";
```

After restoring Redis/R2 connectivity, retain these rows for the worker to
drain. Do not drop the table during rollback; older versions do not process
it, so retain a compatible worker until the backlog is empty. The migration
cannot recover object identifiers lost by deletions before it was installed.

## User-scoped battle submissions

`20260909045921_scoped_battle_submissions` replaces the global submission ID
index with uniqueness on `(userId, submissionId)`. Existing rows are preserved;
different users may subsequently use the same submission ID. Reusing an ID with
a different battle payload for the same user returns HTTP 400. Equivalent
retries retain the original battle ID, and R2 uploads use `If-None-Match: *` so
an already accepted object is never replaced. A failed initial upload can still
be retried without inserting another battle. Legacy submissions without a
stored semantic fingerprint return their original ID without changing metadata
or replacing raw data; unverified retry content cannot repair those old objects.

Deploy this change as a coordinated write cutover: stop and drain the old
Battlelog writers, apply the migration, then start the updated service. Do not
run old and new writers together: old code performs global submission lookups,
and new code requires the composite index for its conflict target. Keep game
clients retrying failed submissions during the cutover. Do not restore the old
runtime or global unique index after different users have reused a submission
ID; use a forward fix or a compatible release. No existing battle records should
be deleted to make a rollback succeed.
