# API database migration evidence

The API schema is maintained in `src/database/drizzle/schema.ts`. New databases
use `migrations/20260901121000_legacy_prisma_baseline/migration.sql` followed by
subsequent Drizzle migrations. Preserve deployed migration names and SQL hashes.
The baseline includes database constraints originally introduced by handwritten
migrations, including reservation checks.

Run `bun run db:migrate:deploy` to apply pending migrations. Drizzle records
completed migrations in `drizzle.__drizzle_migrations`; existing databases must
retain this journal. The legacy ORM adoption path has been retired. Historical
adoption markers may remain in existing databases but are no longer read or
written. An existing database without a Drizzle journal must be restored with
its migration history before using this runner.

## Test databases

`test/database-fixtures.ts` runs the complete migration history in a private
PGlite instance on its first use in each test process. It stores an uncompressed
data-directory image in memory and closes that instance. Each
`createDatabaseBoundary()` call restores its own database from this image, with
`pg_trgm` and custom enum-array decoding enabled.

Tests can commit transactions, change constraints and close their database
without affecting another boundary. The image is never persisted or generated
ahead of the test run: a broken migration still fails fixture initialization.
Concurrent callers share image preparation, not a live database.

From `apps/api`, run `bun run test` for the API suite, including the fixture's
data, schema and concurrent-boundary isolation checks. The 30-second test timeout
remains until CI measurements establish a safe lower budget for the first cold
initialization under runner contention; faster restores alone do not establish
that budget.

## Durable loot publications

Apply `20260904193330_loot_publication_outbox` before deploying the API that
uses it. Loot acceptance commits the loot, Organization records, submissions,
and publication intents in one transaction. The API process dispatches pending
intents in bounded batches; broker or cache failures retain them for retry after
restart. Request-only test layers do not start this worker.

Delivery is at least once: a process can stop after broker confirmation but
before deleting the intent. The stable `loot-publication:<id>` message identifier
and existing source identifiers must be preserved on replay. Search writes are
upserts; instant notification jobs deduplicate by source event, rule, and target.
Pending notification jobs can be re-enqueued, while terminal jobs stay terminal.

Inspect pending work without exposing event bodies:

```sql
SELECT "id", "lootId", "organizationIds", "createdAt", "lastAttemptAt"
FROM "LootPublicationOutbox"
ORDER BY "createdAt";
```

After repairing the failed dependency, leave pending rows in place; the worker
retries them automatically. An archived/deleted Organization loot record no
longer receives pending metadata. Do not delete the table during rollback:
older API versions do not drain it, so retain a compatible dispatcher until its
backlog is empty. The migration cannot reconstruct publications lost before it
was installed; those require reconciliation from their owning data domains.

## Recent Organization activity feed

The API owns `GuildKillActivity`, a 24-hour journal of accepted Organization
kills and their publication state. `makeKillCreation` writes a row for `ELITE2`,
`HERO`, `COLOSSUS`, or `TITAN` after the existing Organization Redis deduplication
succeeds. The journal row, lifetime Organization kill counter, and hourly
Organization bucket commit in one database transaction. The row contains the
Organization, world, NPC identifier, display and visibility fields, and server
time. It does not identify a first reporter or copy personal kill history.

`GET /users/@me/feed` returns the latest 20 entries across the caller's accessible
Organizations within the last 24 hours. It reads current membership and roles,
requires loot read access, and applies existing NPC visibility rules before
aggregation or limiting. Kills use the existing administrative bypass; loots use
the existing owner bypass and require visibility of every associated NPC. A
kill entry groups one Organization, world, NPC, and fixed UTC minute, with a
count and stable identifier. Each nonarchived `OrganizationLootRecord` remains
a separate loot entry, even when another Organization captured the same loot.
Ties use the same stable identifier ordering in both source queries and the
final combined limit.

The response includes `generatedAt`, `windowStart`, and discriminated `kill` or
`loot` items. Each item has its time, world, Organization summary, and NPC
summary. Loot previews include at most three items and `additionalItemsCount`.
The endpoint has no personal reporter identity and does not reconstruct old
kills. See `src/contracts/users/feed-schemas.ts` for the HTTP contract.

`makeGuildKillActivityPublisher` makes one best-effort publication after the
kill transaction commits. The detached attempt has a two-second timeout; failure
is logged and neither rolls back the kill nor retries publication. The history
has no publication state or pending dispatcher. The existing loot outbox remains
unchanged apart from including the complete feed entry in its event.

HTTP and `feed.entry` share the same item contract. Kill entries carry an absolute
count and monotonic version; loot entries have stable identifiers. The gateway
checks current Organization and NPC access before delivery. New feed and kill
events are sent only to web clients offering the `lootlog.feed.v1` capability
alongside the existing realtime subprotocol; older clients retain their existing
event set. Web fetches HTTP
history on entry, after session rejoin, resume, and access changes, then merges complete
WebSocket entries without event-triggered HTTP requests. Live events received
during a history request are buffered and merged by version.

The hourly cleanup runs at minute 15 and deletes expired rows in batches of
5,000, up to 100 batches per run. Queries exclude entries older than 24 hours
before physical cleanup. Hourly cleanup can leave roughly one additional hour
of expired rows on disk; downtime can leave a larger backlog. The lifetime and
hourly kill aggregates remain intact. This retention policy does not change
existing aggregate or loot retention. Lost live publications remain available
through the next HTTP history request until they expire.

Apply `20260906011645_guild_kill_activity` to create the history table directly
without publication columns or a pending index. Deploy the compatible gateway
before enabling the new API publisher, then deploy Web. The migration does not
backfill old activity. Keep the history table when rolling back the feature;
earlier released APIs can ignore it. Review the migration journal against
migration files before applying changes; never rewrite earlier hashes to bypass
a mismatch.

The isolated PostgreSQL integration fixture contains 270,000 accepted rows,
90,000 in the queried Organization, with half of those NPCs hidden from the
reader. One `EXPLAIN (ANALYZE, BUFFERS)` run measured 59.447 ms for the feed SQL;
`pg_total_relation_size` measured 105,078,784 bytes for the journal and its
indexes. These are local fixture measurements, not production latency or a
capacity guarantee. The ratio is about 389 bytes per row for this fixture;
retained volume, NPC text lengths, index maintenance, and concurrent requests
can change both cost and storage.

Run the feed integration tests only with their disposable database preload:

```sh
cd apps/api
bun --conditions=development test --preload ./test/bun.e2e.setup.ts ./test/user-feed.integration.test.ts
```

The test refuses to construct its database client unless that preload has
registered the exact disposable PostgreSQL connection in the current process.
It covers current access and revocation, NPC filtering before grouping, archived
loots, bounded previews, grouping and tie order, duplicate submissions,
transaction rollback, best-effort publication failure, shared HTTP/live entries,
retention, and the populated query.

## Vanity URLs that look like Organization ids

`20260919162954_guild_vanity_url_not_id_like` clears every stored vanity URL
whose slug is empty, all digits, or the reserved `battles` route, then adds
`Guild_vanityUrl_not_id_like_check`. Affected Organizations stay reachable by
id and can choose a new vanity URL. Count them first:

```sql
SELECT count(*) FROM "Guild"
WHERE "vanityUrl" IS NOT NULL
  AND trim(BOTH '-' FROM regexp_replace(lower("vanityUrl"), '[^a-z0-9]+', '-', 'g'))
      ~ '^([0-9]*|battles)$';
```

Apply the migration before deploying the API revision that validates vanity
URLs. Only that revision writes `guild-lookup:v2:*` cache entries, so applying
the migration first guarantees no entry can hold a vanity URL the migration
cleared; in the reverse order such an entry would outlive the migration by up
to one hour, keep a cleared `battles` alias resolving, and make the settings
form resubmit the stale value into a 400. The constraint also closes the write
path at once: until the new revision ships, the older one answers an all-digit
or empty-slug vanity URL with a 500 instead of a 400, and every other save is
unaffected. Legacy `guild:<id or vanity URL>` cache entries are never read
again and expire within one hour.

## Free-text loot search

`20260920141617_player_snapshot_name_trigram` installs `pg_trgm` and adds
`PlayerSnapshot_name_trgm_idx`. `pg_trgm` is a trusted extension, so the
database owner can install it without superuser rights. Apply the migration
before deploying the API revision that resolves search terms; an older revision
ignores the index.

`makeLootQueryPersistence` resolves the `search` term before the page query. It
asks, concurrently, which `ItemSnapshot`, `NpcSnapshot` and `PlayerSnapshot`
ids match it. Each relation then contributes an arm only when it can still
match, using the resolved snapshot ids instead of a correlated name join. A
term that matches no snapshot skips the page query and returns no rows.

The previous condition ORed four correlated subqueries that read a snapshot row
and ran `ILIKE` for every loot the descending scan examined, so a term matching
nothing paid for the whole Organization before returning nothing. Measured on a
local production copy (13,403,753 loots; the largest Organization holds 383,683
nonarchived records; `shared_buffers` 512 MiB, parallel query disabled), a
no-match term exceeded a 60 s statement timeout; after the change the same
request resolves in about 11 ms of database time and runs no page query. These
are local fixture measurements, not production latency.

`Loot.location` is no longer searchable. The fourth arm matched map names,
which the product never offered: the Web search field advertises items,
monsters and players, and the loot query contract has no location filter.
Removing it also removed the only reason to index a text column on the
13-million-row `Loot` table.

A term matching more than `LOOT_SEARCH_SNAPSHOT_LIMIT` snapshots of one
relation keeps that relation's original pattern arm: such a term matches
densely, so the descending scan reaches its page early. Case-insensitive
substring semantics over item, NPC and player names, Organization isolation,
archival, visibility, ordering and filter combinations are unchanged; the
resolution queries use the same `ILIKE` patterns the arms used before.

`search` is the fallback for names the search service has not indexed. The Web
palette resolves what the user types through `apps/search` and commits exact
names into `npcs`, `itemNames` or `players`; when that service is stale, broken
or missing an entry, the palette offers the typed term as a direct loot search
instead. It reads the same snapshot rows the loot list already owns, so a
missing search index cannot hide a loot from its Organization.

`PlayerSnapshot_name_trgm_idx` measures 36 MB on that copy and replaces a
250 ms sequential scan with a sub-millisecond probe. Loot ingestion adds one
GIN entry per inserted player snapshot; the copy received at most about 30,000
loots per day during the sampled week. The migrator runs inside a transaction,
so this is a plain `CREATE INDEX` holding a `SHARE` lock on `PlayerSnapshot`
while it builds.

## Organization lookup indexes

`20260928183954_organization_lookup_indexes` adds `Role_guildId_idx` and
`LootlogConfigNpc_lootlogConfigId_idx` for Organization role lists, NPC
configuration reads, loot acceptance, and Organization deletion. It removes
the redundant nonunique `Role_id_guildId_idx`, retaining `Role_id_guildId_key`
and all existing constraints. Query results and HTTP contracts are unchanged.

Run `bun run db:migrate:deploy` from `apps/api` during a low-traffic window.
The runner executes pending migrations in a transaction, so it cannot use
`CREATE INDEX CONCURRENTLY`. Each index build temporarily blocks writes to
its table. Dropping the redundant index also blocks reads of `Role`; the drop
runs last to avoid holding that stronger lock during the builds. Locks remain
until the migration transaction commits. Older API revisions can use the new
indexes, so an application rollback does not require reverting this migration.

Before migration and again after a comparable period of normal traffic, collect
the following counters from the API database in separate, fresh transactions:

```sql
SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('Role', 'LootlogConfigNpc')
ORDER BY relname;

SELECT relname, indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('Role', 'LootlogConfigNpc')
ORDER BY relname, indexrelname;
```

Compare counter deltas without resetting shared statistics. Selective lookups
by `guildId` or `lootlogConfigId` should use the new indexes and stop repeatedly
reading whole tables. Confirm with `EXPLAIN (ANALYZE, BUFFERS)` for the affected
role and NPC configuration reads using representative Organization ids. A
sequential scan remains valid for broad queries or very small tables, so a
nonzero `seq_scan` delta alone does not establish a regression.

Local verification used disposable PostgreSQL 17.10 with 770 synthetic
Organizations, 15,400 roles, and 6,900 NPC configuration rows. Drizzle-generated
queries returned identical ordered rows before and after migration. All three
plans changed from sequential scans to scans of the new indexes. The following
execution times are medians of five warm `EXPLAIN (ANALYZE, BUFFERS)` runs,
not production latency estimates:

| Lookup                                                   | Rows returned | Before / after, ms | Before / after shared buffer hits |
| -------------------------------------------------------- | ------------- | ------------------ | --------------------------------- |
| Roles in one Organization, ordered by position           | 20            | 0.537 / 0.014      | 266 / 4                           |
| NPC configuration for one Organization, ordered by id    | 9             | 0.202 / 0.013      | 92 / 3                            |
| NPC configuration for three Organizations, ordered by id | 27            | 0.385 / 0.021      | 92 / 9                            |

The installed migrator applied the new migration to the populated database,
recorded its exact SQL hash, and made no changes on a second run. Existing
uniqueness and foreign-key checks still rejected duplicate roles, missing
parents, and restricted parent deletions.

## Discord member synchronization

`20260928224047_member_sync_hot_updates` removes
`Member_userId_guildId_active_lastDiscordSyncAt_idx`. The stale-member query in
`user-guild-list.data-layer.ts` already restricts one Discord user to known
Organization ids. `Member_userId_guildId_key` bounds that query to at most one
row per Organization; `active` and `lastDiscordSyncAt` remain filters on those
rows. No current query needs a timestamp-leading index.

A successful Discord read still advances `lastDiscordSyncAt` and attempt
metadata, even when the member and roles match. This records freshness without
rewriting unchanged profile fields or role assignments. Removing the timestamp
index makes these updates eligible for PostgreSQL HOT updates when the existing
heap page has enough free space. Real changes to indexed `active` or
`globalUserId` still need index maintenance. The migration does not change
`fillfactor` or autovacuum settings. See PostgreSQL's
[HOT requirements](https://www.postgresql.org/docs/17/storage-hot.html).

The soft refresh TTL stays at 15 minutes outside the local environment. It is a
refresh trigger, not a hard authorization expiry. Raising it to an hour would
extend the interval before discovering revoked access. The current bot does
not consume member-update or member-removal events, so push delivery cannot
replace this refresh. Role changes and reactivation still invalidate member
caches and publish `members.update`; deactivation publishes `members.remove`.
Name and avatar changes invalidate member views without triggering a permission
rebalance. Successful no-op synchronization refreshes permission-cache freshness
without publishing a change event.

`MemberSyncDelivery` stores one pending delivery per member in the same
transaction as the member and role changes. Every writer that deactivates a
member queues it the same way: Discord synchronization, Organizations missing
from the user's Discord guild list, manual deactivation and guild deletion.
`permissionsChanged` remains true if any pending change requires permission
invalidation, and each queued change increments `version`.

Delivery first claims the row by setting `claimedUntil` 30 seconds ahead in one
autocommitted statement. It then reads the committed member state and performs
the Redis invalidation and RabbitMQ publication outside any database
transaction, with a 10-second timeout. A successful delivery deletes the row
only if `version` is unchanged; a change queued meanwhile keeps the row and is
delivered next. A failed delivery releases its claim, and a claim left by a
stopped process expires. A process failure after publication but before
deletion can publish the event again; consumers must continue to accept
at-least-once delivery.

The `BullWorkers` background layer runs
`makeMemberDelivery.dispatchPending` immediately on startup and waits five
seconds between passes. Each pass handles at most 25 unclaimed pending members
through the same delivery used after each write. A cursor advances by
`memberId` and cycles through the backlog so repeatedly failing rows cannot
block later rows. Recovery does not require a new Discord sync, a redelivered
guild event or another request from the affected member.

Apply the migration before deploying the API revision that uses
`MemberSyncDelivery`. The transactional migrator uses ordinary `DROP INDEX`,
which briefly blocks reads and writes to `Member`; choose a low-traffic window.
The migration sets a five-second `lock_timeout`, so a busy `Member` table fails
the whole migration instead of queuing application traffic behind it; retry it
when traffic allows. The index drop runs last so its lock is not held while the
new table and foreign key are created. An application rollback
does not need to recreate the removed index. Older API revisions do not drain
pending deliveries, so retain the table and a compatible dispatcher until the
backlog is empty. Finish in-flight old-version syncs and retry their failed jobs
before switching the member workers. Older writers do not create pending rows,
so the migration cannot reconstruct an invalidation lost before that writer
was deployed; any such failure needs reconciliation through the old writer.

### Measure the change

Before rollout and after comparable normal-traffic intervals, collect these
counters in fresh transactions. Compare deltas without resetting shared
statistics:

```sql
SELECT relname, n_tup_ins, n_tup_upd, n_tup_del, n_tup_hot_upd,
       n_live_tup, n_dead_tup, last_autovacuum,
       pg_table_size(relid) AS table_bytes,
       pg_indexes_size(relid) AS index_bytes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('Member', '_MemberToRole')
ORDER BY relname;

SELECT count(*) AS pending_deliveries, min("createdAt") AS oldest_pending
FROM "MemberSyncDelivery";
```

Role-assignment inserts and deletes should follow actual role changes.
`Member` updates still include freshness writes; compare the HOT update ratio
and table growth as well as their count. Compare `members.update`, gateway
`permissions.rebalance`, and permission endpoint rates with observed role and
active status changes. Pending deliveries should drain automatically after a
failed cache/broker dependency recovers. Do not delete pending rows to make the
backlog metric disappear.

Local verification used disposable PostgreSQL 17.10 with 100,000 synthetic
members. The Drizzle-generated stale-member query returned the same 13 rows
before and after migration, switching to `Member_userId_guildId_key`. Median
execution time over five warm runs was 0.026 ms before and 0.019 ms after, with
four shared buffer hits in each plan. In a fixture with `fillfactor=70` to
isolate HOT eligibility, 1,000 spaced metadata updates changed from zero HOT
updates before migration to 1,000 after it. These are fixture measurements,
not production latency or HOT-rate guarantees. The installed migrator applied
the migration, recorded its SQL hash, and made no changes on a second run;
deleting a member also deleted its pending delivery through the foreign key.

### Reclaim existing bloat

The migration prevents unnecessary future work; it does not compact the
existing `Member` or `_MemberToRole` heaps. Reclamation is a separate database
operation after the corrected sync behavior is deployed and measured.

1. Record table/index sizes, live/dead row estimates, autovacuum progress and
   long-running transactions. Confirm recoverable backups and available disk
   space, then rehearse the chosen operation on a restored database. Dead-row
   estimates alone are not a measurement of reusable space or heap bloat.
2. Let autovacuum reclaim reusable space, or schedule ordinary
   `VACUUM (ANALYZE)` for these two tables. It normally keeps freed space inside
   the table rather than returning it to the filesystem. See PostgreSQL's
   [vacuum guidance](https://www.postgresql.org/docs/17/routine-vacuuming.html).
3. If filesystem reclamation is required, use the established logical migration
   and cutover procedure, or schedule a table repack. Both tables have primary
   keys. For `pg_repack`, verify server/extension/client compatibility and
   privileges, reserve the documented extra disk capacity, avoid concurrent
   DDL, and start with `--dry-run`. Target only `public."Member"` and
   `public."_MemberToRole"`; use `--no-kill-backend` so a lock conflict skips a
   table instead of cancelling application sessions. Repack still takes short
   exclusive locks at setup and swap. See the
   [pg_repack requirements and options](https://reorg.github.io/pg_repack/).
4. If repack or a logical cutover is unavailable, plan a maintenance window for
   `VACUUM FULL`; it rewrites the table, needs extra disk space and holds an
   exclusive lock. It is not part of the application migration.
5. Recheck sizes, constraints, query plans, pending deliveries and permission
   revocation after reclamation. Leave autovacuum enabled and continue comparing
   counter deltas to detect renewed churn.
