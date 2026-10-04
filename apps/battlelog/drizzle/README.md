# Battlelog database migrations

Maintain `src/database/schema.ts` directly. Run `bun run db:generate` to derive
SQL migrations and Drizzle snapshots from it, review the artifacts, then apply
them with `bun run db:migrate:deploy`. Keep historical SQL and snapshots;
database introspection must not overwrite the source schema. The deploy command
initializes empty databases and applies only pending migrations to databases
already tracked by Drizzle.

## Time-ordered battle IDs

`20261004143306_battle_uuidv7_ids` replaces text battle IDs with UUIDv7
values. The first 48 bits of an ID are the battle's `createdAt` in Unix
milliseconds, and the `battles_id_createdAt_check` constraint keeps both
equal, so the list, date filters and analytics order and filter by `id`
alone. `createdAt` becomes `timestamptz(3)`.

Every existing battle receives a new ID built from its `createdAt`. Battles
saved in the same millisecond keep their previous ID order, so paging through
a user's history returns the same order as before. `battle_legacy_ids` maps
each old ID (Prisma CUID, cuid2 or UUIDv4) to the new one: paths that take a
battle ID still accept old links, and R2 keeps timelines of these battles
under their old ID. `battle_object_deletions` therefore records the R2 object
ID, which is the old ID for migrated battles. Drop the table after timelines
leave R2 (LOO-255); old links stop resolving then.

The migration rewrites `battles`, `battle_warriors` and their indexes in one
transaction and ships with the TimescaleDB migration (LOO-254). Released
services still write text IDs, so stop them before applying it. On the local
production copy (11.2 million battles, 0.5 CPU) it takes about 25
minutes and shrinks the database from 59 GB to 32 GB, because the rewrite
also drops the space of the columns `20261004114013_battle_derived_data`
removed.

## Participant key and derived battle data

`20261004114013_battle_derived_data` removes data that Battlelog can derive.
Participant statistics live only in their columns; the `stats` JSON copy and
`statsVersion` are dropped. `battles.statistics` is dropped: awards are
computed from the participants when a battle is read. A participant is
identified by `("battleId", "originalId")` instead of a random `id`. Redundant
participant and battle indexes are dropped, and `user_characters` and
`battle_object_deletions` store `timestamptz`.

The migration ships with the TimescaleDB migration (LOO-254) and follows its
cutover: released services still write the dropped columns, and the
participant primary key is built inside the migration transaction. Dropping a
column does not shrink existing rows; their space returns when the tables are
rewritten.

Submissions accept a warrior only under its own `originalId`, so a battle
cannot hold the same participant twice. Rows accepted earlier are checked by
the primary key: if the migration fails with a duplicate key, it rolls back
completely. List the affected participants before deciding how to repair them:

```sql
SELECT "battleId", "originalId", count(*)
FROM "battle_warriors"
GROUP BY "battleId", "originalId"
HAVING count(*) > 1;
```

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
