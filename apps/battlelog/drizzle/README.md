# Battlelog database migrations

Maintain `src/database/schema.ts` directly. Run `bun run db:generate` to derive
SQL migrations and Drizzle snapshots from it, review the artifacts, then apply
them with `bun run db:migrate:deploy`. Keep historical SQL and snapshots;
database introspection must not overwrite the source schema. The deploy command
initializes empty databases and applies only pending migrations to databases
already tracked by Drizzle.

## TimescaleDB battle tables

`20261005000630_battlelog_timescale` gives Battlelog its TimescaleDB schema in
one step:

- **Battle IDs are UUIDv7.** The first 48 bits of an ID are the battle's
  `createdAt` in Unix milliseconds; `battles_id_createdAt_check` keeps both
  equal, so the list, date filters and analytics order and filter by `id`.
  `createdAt` and `updatedAt` are `timestamptz`.
- **Hypertables.** `battles` and `battle_timelines` are partitioned by battle
  ID in 7-day chunks. `battles` is compressed 7 days after a chunk closes,
  segmented by `"userId"`; timelines are zstd-compressed already and are not.
- **Participants stay a plain table.** Analytics look up a battle's
  participants one battle at a time. On compressed chunks each lookup
  decompresses a whole batch and plans every chunk: on the local production
  copy, a head-to-head read for one large history ran for more than 8 minutes.
  Compressing participants needs analytics that read a user's participants in
  one pass first.
- **No duplicated or derived data.** Participant statistics live only in their
  columns; `battles.statistics` is computed when a battle is read. A
  participant is identified by `("battleId", "originalId")`.
- **Plain side tables.** A unique index on a hypertable must contain the
  partition column, so `(userId, submissionId)` lives in `battle_submissions`.
  `BattleDeletion` removes a battle's rows from every table together instead
  of relying on cascading foreign keys into the hypertable.
- **Timelines.** New battles store the submitted events in `battle_timelines`
  in the same transaction as the battle. Battles saved before keep their R2
  object; `battle_legacy_ids` maps their old ID (Prisma CUID, cuid2 or UUIDv4)
  to the new one, so old links resolve and R2 reads and deletions use the old
  key. Drop it together with the R2 bucket.

The migration creates the tables on an empty database (tests, new
environments) and refuses to run when `battles` holds rows. PGlite has no
TimescaleDB, so tests there keep plain tables.

### Moving a database with battles

`scripts/battlelog-timescale-cutover.ts` builds the new tables in the
`battlelog_next` schema from the migration's `BEGIN`/`END battle tables`
section and copies the battles while the released service keeps reading and
writing. Triggers on the old tables record every battle the service inserts,
changes or deletes during the copy. Each step is manual:

1. `prepare` creates the `timescaledb` extension, `battlelog_next`, the change
   triggers and a `createdAt` index on the old battles. Compression policies
   stay paused during the copy.
2. `copy` copies battles in whole milliseconds of `createdAt`, one transaction
   per batch (`CUTOVER_BATCH_SIZE`, 20,000 by default). Every battle gets a
   UUIDv7 from its `createdAt`; battles saved in the same millisecond keep
   their previous order. It resumes where it stopped and compresses the
   finished chunks at the end. Run it again until it reports no new battles;
   `status` shows its progress and the pending changes.
3. `cutover` blocks writes to the old tables (reads continue), copies the
   remaining battles, re-copies every recorded change, moves the old tables to
   `battlelog_old` and the new ones to `public`, applies the rest of the
   migration, resumes the compression policies and records the migration for
   Drizzle. Release the new Battlelog service right after it: until the new
   pods are ready, the released service fails against the new schema, and
   battles submitted in that gap are rejected and lost, because the game
   client retries for about a second.
4. `verify` compares the old and new tables; `cleanup` drops `battlelog_old`.

Until `cleanup`, rolling back means moving the tables back and releasing the
previous service; battles saved after the cutover would have to be copied back
by hand, so prefer a forward fix.

### Backup and restore

CNPG's barman backups are physical and restore TimescaleDB unchanged. For a
logical copy, dump with `pg_dump -Fd` and restore into a database that already
has the extension:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT timescaledb_pre_restore();
-- pg_restore -Fd -d battlelog <dump>
SELECT timescaledb_post_restore();
```

Restore with the same TimescaleDB version as the dump (2.24.0).

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
