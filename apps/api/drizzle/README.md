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

## Immutable NPC observations

`NpcSnapshot` records the attributes accepted with a loot submission. Lists,
details, statistics, feed entries, allocation, and derived delivery use that
observation for NPC display and source visibility. A later observation does not
change the level used to authorize an earlier loot. For example, observations
of the same NPC id and name at levels 183 and 210 use separate revisions: a
role capped at 190 can satisfy the level condition for the first, but not the
second. Other Organization access checks still apply.

Allocation mutations require current loot write access and visibility of the
persisted source loot. Queued and retried loot notifications recheck that source
before dispatch; ordinary user notification history also uses current source
visibility. Revoking access can therefore block pending delivery and hide a
history entry without changing the accepted loot or its NPC observation.

`createNpcSnapshotHash` in `packages/database/src/snapshot-hash.ts` identifies a
revision by its identity namespace, game version, supplied NPC id, name, derived
NPC type, level, icon, profession, weight and Margonem type. Every world of an
edition uses the same NPC ids, so the world is not part of it (see
"Revisions per game edition" below). Missing and null optional attributes are
equivalent; empty strings and zero remain distinct values. The name participates in revision identity, so a rename creates a new
revision. Returning to an identical observation reuses its existing revision.
This model has no mutable latest-NPC record for a delayed submission to regress.
Retrying an already accepted loot keeps its original snapshot associations.

`identityNamespace` records what `npcId` means; its values are defined in
`@lootlog/schema/npc-identity`. Margonem gives every spawn a runtime id
(`npc.id`, the battle `originalId`) and every monster template a template id
(`npc.tpl`). Clients that send `npcs[].templateId` store the observation under
`template` with that id. A client that reports `runtimeId` without a template
stores it under `runtime`; the API never promotes a runtime id to a template.
Deployed clients that send only the overloaded `id` keep `legacy`: normal battle
loot may have supplied a template id, while fallback and dialog loot may have
supplied a runtime id. Equal numbers in different namespaces are unrelated, and
no mapping between them is inferred. The game version, described below,
separates Margonem editions.

`20260930102644_loot_npc_runtime_id` adds the nullable `LootNpc.runtimeNpcId`,
the looted spawn reported beside the catalog identity. Adding a nullable column
without a default changes only the catalog. Older rows and older clients leave
it null. The activity feed uses it, falling back to the snapshot id, to link a
loot to the kill of the same spawn, because kills and NPC statistics are keyed
by the runtime id.

Timers keep `npcId` and `timerKey` on the runtime id, so spawns of one template
keep independent timers; manual timers keep their generated id with a null
template. The timer `npc` JSON stores `templateId`. An automatic submission
without one keeps the stored value, and event respawn windows preserve it.
`TIMER_BEFORE_SPAWN` rules match `npcTemplateIds` against it and `npcId` or
`npcIds` against the timer's own id.

Deploy explicit identities in this order: apply the migration, deploy search
(which accepts `identityNamespace`, keeps legacy catalog keys, and prefixes the
others), then the API, then Web, then the game client. An API rollback keeps
accepting new clients because they still send `id`. Keep search at least at
this revision while the API publishes namespaced observations, or equal ids
from different namespaces would share one catalog group. Saved filters and
legacy snapshots are not remapped; that repair belongs to
[LOO-38](https://linear.app/lootlog/issue/LOO-38).

`20260930003916_npc_observation_revisions` adds `identityNamespace` with default
`legacy`, nullable `world` and `snapshotHash`, and replaces `NpcSnapshot_npcId_name_key` with
`NpcSnapshot_npcId_snapshotHash_key`. Existing rows retain their attributes and
`LootNpc` associations; their world and hash stay null because the migration
cannot recover the original observation or identity provenance. New submissions
use hashed revisions, including when their attributes match an unhashed legacy
row. The API acceptance writer and CLI seed writer share the revision function.
The existing name and type/level indexes remain available to readers.

NPC search publications carry the optional `snapshotHash`; since LOO-250 the
search consumer ignores it and stores one document per catalog entry (see
"Revisions per game edition"). It preserves an accepted NPC type;
classification from weight remains a fallback for legacy type values.

Public NPC search remains a catalog of suggestions with the existing NPC ids.
Every indexed document carries an internal `catalogKey` for its game version,
identity namespace, id and Margonem type; legacy keys omit the namespace.
Search uses Meilisearch's
[`distinct` parameter](https://www.meilisearch.com/docs/reference/api/search/search-with-post)
to group documents written before that change by catalog entry before the
requested hit limit. A large revision
history for one NPC cannot consume the slots for other catalog identities,
including requests that resolve several selected NPC ids. The existing
name/type collapse still applies after catalog grouping and keeps a template
hit over legacy and runtime hits of the same name and type. Search ranking chooses
the displayed suggestion; it is not a current-level authority or a source of
loot access decisions. Neither hash order nor the highest observed level
establishes chronology. The notification rule form stores a selected template
hit as a template id; timer-based selection and source visibility remain the
work of [LOO-37](https://linear.app/lootlog/issue/LOO-37).

Deploy this change with a coordinated writer transition:

1. Stop routing new loot writes to the old API revision and let in-flight
   requests finish. Stop old seed/import jobs that write `NpcSnapshot`, then
   stop old search instances so their consumers cannot write documents without
   catalog grouping metadata during the transition. Retain queued publications.
2. Apply the migration with `bun run db:migrate:deploy`. The migrator runs in a
   transaction; schedule the unique-index replacement for a window that allows
   the required table locks.
3. Deploy the new search service before the new API publisher. Its startup
   settings make `catalogKey` and `id` filterable, and it accepts both hashed and
   older events. After the database migration, rebuild the indexes with
   `bun run seed` in `apps/search`; the rebuilt documents include the grouping
   field.
4. Start only API and seed/import revisions that target the new snapshot key,
   then resume ingestion. Old writers use `ON CONFLICT (npcId, name)` and cannot
   run after the old unique index is removed.
5. Verify that new loots reference rows with non-null world and hash, and that
   different levels under one id and name coexist without changing earlier
   links. Check a restricted role through the list, detail, and derived views.

The HTTP payload is unchanged, so existing userscripts and browser extensions
continue to submit through the same API. Snapshot hashing adds no game-client
work. During rollback, retain a writer compatible with the new schema and reuse
a compatible immutable image and a hash-aware search consumer. Do not restore
the old unique index once multiple revisions share an id and name. Do not delete
new revisions or relink accepted loots to make an older writer fit.

This migration prevents new snapshot collisions. It does not correct historical
levels, reconstruct lost request data, remap overloaded ids, or repair historical
NPC attributes in search projections and saved notification filters. Those
changes require independent evidence and the auditable repair tracked in
[LOO-38](https://linear.app/lootlog/issue/LOO-38).

### Margonem source evidence

The inspected external source snapshot is identified by bundle filename
`main.min1781609507010.js`. Paths below are relative to its extracted
`src/js/Margonem` directory; the filename does not establish a verified build
date, origin, or coverage of every deployed NI/SI version.

- `core/characters/NpcManager.js:166-192` indexes instances by `npcData.id`;
  lines 231-246 clone template data by `data.tpl` and skip the template's `id`.
  `core/Communication.js:602` contains an example with runtime id `313103` and
  template id `257636`.
- `core/characters/NpcTplManager.js:13-26` replaces template contents under an
  existing id. `core/Updateable.js:3-13` applies supplied fields to an instance,
  and `core/characters/NpcManager.js:252-261` resolves its current icon.

These implementations support retaining observed content separately from
identity. They do not establish historical runtime/template mappings. Lootlog's
bridge already keeps runtime `id` and `templateId` separately in
`apps/game-client/src/lib/margonem-runtime/runtime-adapter.ts`; this snapshot
migration leaves that boundary and the existing client transport unchanged.

## Margonem game version

`GameVersion` from `@lootlog/schema/game-version` names the Margonem edition
that produced an observation: `pl` for `*.margonem.pl`, `en` for
`*.margonem.com`. `world` scopes gameplay and stays independent of it. The
edition namespaces catalog identities; it does not prove the language of every
text in a payload.

The game client derives it once per page in the runtime adapter
(`resolveGameVersion`) from the page hostname: the edition domain itself or
any subdomain of it; the client needs no world list. Lookalike and unknown
hosts resolve to null and are never treated as Polish. NI and SI are served
from the same world URL and differ only by the `interface` cookie, so the
hostname gives both interfaces, and every installation method, the same value. The character list uses the same value to pick the edition's public
API; on an unrecognized host it reads only the game's own cached list.

Evidence from the source snapshot described below: `core/Communication.js:376-395`
builds the WebSocket URL as `<world>.margonem.<page TLD>`, `core/HelpersTS.ts:92-101`
reads the edition from `__build.lang` and compares it with `CFG.LANG` (`pl`,
`en`), and `checkOldBrowser.js:27-30` switches a `pl` player to SI by setting
the `interface` cookie for the `margonem.pl` domain rather than changing the
URL. The snapshot does not establish that no other edition domain exists; an
unlisted domain stays unknown until verified.

`POST /loots` accepts an optional nullable `gameVersion`. The API validates the
value but cannot verify it: requests reach it through the browser extension or
userscript transport, not from the game page's origin. It is provenance, not an
Organization authorization input. Since LOO-250 the API fills an absent or null
value from the world (see below), so every loot and revision has one.

`20260930143511_loot_game_version` creates the `GameVersion` enum and adds the
nullable `Loot.gameVersion` and `NpcSnapshot.gameVersion`. Adding nullable
columns without a default changes only the catalog. Existing rows stay null,
which keeps them identifiable as unknown for the repair in
[LOO-38](https://linear.app/lootlog/issue/LOO-38); the migration does not infer
an edition from the world name.

- The loot `uniqueId` still hashes item hids and world, so a retry, or the same
  loot submitted by an older and a newer client, resolves to one loot. The first
  accepted game version is kept; a later submission never changes it.
- NPC revisions of different editions never share a row.
- NPC search publications carry `gameVersion`. Search adds it to the document,
  prefixes the catalog key with it, and returns it on NPC hits. Name
  suggestions stay separate per edition.
- Item revisions and item search documents include the game version; see
  "Item observation revisions" below.
- Timers remain keyed by Organization, world and runtime NPC id and do not
  store a game version. An Organization represents one faction, so its timers
  come from one edition.

Deploy the migration, then search, then the API, then the game client. An API
rollback keeps accepting new clients because older revisions ignore the field.

## Item observation revisions

`ItemSnapshot` records one observed revision of an item template: its game
version, item id, name, icon, item type, and revision stats.
`createItemSnapshotHash` in `packages/database/src/snapshot-hash.ts` hashes
these into `snapshotHash`, and `ItemSnapshot_itemId_snapshotHash_key` makes it
the revision identity. A Polish and an English name with equal stats, a rename,
an icon change, or a stat change are separate revisions; an identical
observation reuses its revision. Names are stored as the client sent them and
are never translated.

Margonem item stats also carry per-instance values. `ITEM_INSTANCE_STAT_KEYS`
in `packages/database/src/item-stat.ts` lists them: `created`, `gold`,
`amount`, and `opis`. `splitItemStat` removes them from the revision, so they
never create one, and the API stores them on the looted item as
`LootItem.instanceStat`. Loot lists, details, the activity feed, and chat
allocation join both parts with `joinItemStat` (or the equivalent SQL in the
feed), so each loot shows its own creation time, amount, gold value, and
description instead of those of the revision's first writer. `statsHash` keeps
the hash of the revision stats alone, unchanged from earlier revisions, so
presentation variants of one stat revision remain groupable.

`20260930150928_item_observation_revisions` drops
`ItemSnapshot_itemId_statsHash_key`, adds nullable `ItemSnapshot.gameVersion`,
`ItemSnapshot.snapshotHash`, and `LootItem.instanceStat`, and creates
`ItemSnapshot_itemId_snapshotHash_key`. Existing rows and `LootItem` links keep
their values. Their `snapshotHash` stays null because the first writer chose
their name and icon and their `statRaw` kept its per-instance values; new
observations never reuse them. Loot items accepted earlier keep a null
`instanceStat` and show the stats stored on their snapshot. Repairing the
existing associations belongs to
[LOO-38](https://linear.app/lootlog/issue/LOO-38), not to a translation update.

On a local copy of production (28,634 item snapshots, 21 MB; about 32 million
loot items, 8.3 GB), the migration completed in well under a second: the index
is rebuilt on the small snapshot table, and adding nullable columns without a
default changes only the catalog of `LootItem`. The rebuilt search seed query
read all 28,634 snapshots in about 8 seconds and produced 13,625 item
documents. These are local measurements, not production latency.

The API acceptance writer and the CLI seed writer share `splitItemStat` and
`createItemSnapshotHash`. Drain earlier API and seed writers before applying
the migration: their `ON CONFLICT ("itemId", "statsHash")` target no longer
exists. Watched items are unaffected: they store the selected item id and
name, match drops by item id and world, and read presentation from a snapshot
with that id and name.

Item search publications carry the revision stats and `gameVersion`. Search
stores one document per game version, item id, and name, and merges worlds
into it, so each language of an item stays searchable instead of the last
observation replacing it. Search revisions before this one ignore the field and
keep one document per item id. Deploy search before the API, then rebuild the
search indexes with `bun run seed` in `apps/search` to replace the documents
keyed by item id alone.

## Revisions per game edition

Margonem uses the same NPC and item ids on every world of an edition
([LOO-250](https://linear.app/lootlog/issue/LOO-250)). Revisions are therefore
one per edition, and every loot and revision records its edition.

- `gameVersionOfWorld` in `@lootlog/schema/game-version` maps a world to its
  edition: `cronus`, `husaria` and `steamrealm` are `en`, every other world is
  `pl`. A new English world needs an entry in `EN_EDITION_WORLDS`. This
  reverses the rule of keeping no world list: loots accepted before
  [LOO-35](https://linear.app/lootlog/issue/LOO-35), and clients that send no
  game version, have no other source. `gameVersionOfWorldSql` in
  `src/database/drizzle/game-version.ts` is the same map in SQL.
- Loot acceptance uses the declared `gameVersion`. A declared value that
  differs from the map wins and is logged as a warning with the world and both
  values. A submission without one is a client defect: the API logs a warning
  and fills it from the world so the loot is not lost. This fallback is
  deprecated; once those warnings stop, a breaking release makes
  `gameVersion` required and removes it. The backfill, the search rebuild and
  older search publications keep using the map for data written without an
  edition. The game client already declares
  it from the hostname for every installation method, and on the local
  production copy all 1,230 loots with a declared edition agreed with the map.
- `createNpcSnapshotHash` leaves the world out (`npc-observation-v2`) and
  requires the game version, so one observation on several worlds of an
  edition is one revision and editions never share one. New revisions store
  a null `NpcSnapshot.world`; the column is deprecated and a later migration
  drops it once the repair below is complete and no older API writer runs.
  `createItemSnapshotHash` is unchanged and now always receives an edition.
- Search stores one NPC document per edition, identity namespace, id and
  Margonem type, with a merged `worlds` list, as items already did. NPC
  publications carry the observing `lootId`; a document keeps the attributes
  of the latest loot, so a retried or redelivered older publication only adds
  its world. The
  `world` query parameter of `/npcs` and `/items` is accepted, ignored and
  marked deprecated in the contract; on `/all` it still filters players. The
  index rebuild (`bun run seed`) takes the edition of a revision, or of its
  loot for revisions written before editions.

Deploy search first: it indexes both older and new publications. Then deploy
the API, run the repair below, and rebuild the search indexes. An API rollback
to a revision before this one is safe for reads, but that writer hashes NPC
observations per world again and stores loots without an edition from older
clients; run the repair's plan again after rolling forward.

## Legacy association repair

Rows written before immutable, per-edition revisions can point at the wrong
revision, and most have no edition at all:

- A legacy `NpcSnapshot` kept the first level seen for an id and name, so later
  kills of a reworked NPC show a stale level
  ([LOO-38](https://linear.app/lootlog/issue/LOO-38)). That level decides which
  roles can read the loot.
- A legacy `ItemSnapshot` kept the first name seen for an item id and stats, so
  loots of one edition can show the other edition's name.
- Revisions accepted between LOO-34 and LOO-250 are one per world, and loots
  and revisions from clients without a game version have none.
- Saved timer notification rules can hold ids from the legacy NPC catalog that
  never match a timer.

The repair corrects these from independent evidence, records every change and
can be rolled back exactly. It runs as a separate, resumable command; nothing
runs by itself.

### Migrations

`20260930204919_legacy_association_repair` creates four empty tables and
`20261001000448_legacy_repair_snapshot_log` a fifth. Neither changes an
existing row:

- `LegacyRepairRun`: one row per applied manifest, with its version, SHA-256,
  entry count and status (`applying`, `applied`, `rollingBack`, `rolledBack`).
- `LegacyRepairEntry`: one row per manifest decision, with its domain, action,
  classification, unresolved reason, source and target snapshot ids, row
  count, checksum, cursor and counters (`appliedRows`, `alreadyOnTargetRows`,
  `skippedRows`, `restoredRows`, `keptRows`).
- `LegacyRepairLink`: one row per moved `LootNpc` or `LootItem` link:
  `(runId, rowTable, rowId, entryId, fromSnapshotId, toSnapshotId, appliedAt)`
  plus the rollback outcome.
- `LegacyRepairSnapshot`: one row per revision whose identity the run changed,
  a `promote` or a `retire`, with its previous hash, game version, world and,
  for items, stats.
- `NotificationRuleUnresolvedSelection`: a saved selection that does not
  identify what its rule matches, deleted with its rule.

The log holds snapshot, link and rule ids and counts. It holds no Organization
ids or names and is retained after a run completes or is rolled back.

### Plan

`plan` reads the database in one repeatable-read, read-only transaction and
writes a manifest, its row files and `summary.json` into `--out`, which must
stay outside the repository and private. The edition of a loot is its game
version, or its world's edition. For every NPC and item revision that is not
already an edition revision:

- **Promote.** A revision written before editions takes the edition of most of
  its loots at its own level (for an item, the edition whose client first
  wrote its name, from its earliest link). It keeps every attribute and its
  links; only its game version, world and hash change, and an item's shared
  stats lose the per-instance entries its first writer left in them. A later
  revision that holds the same edition hash hands it over and its links move
  to the promoted revision. When two revisions written before editions share
  an edition hash, only the first is promoted and the links of the other
  relink to it; `apply` refuses two promotions to one hash.
- **Relink.** Links from the other edition, and every link of a per-world or
  unversioned revision, move to the revision of their edition with the same
  attributes, which is created or reused. An item takes the name and icon of
  that edition's revision of the same item id and type; a name is never
  translated. Without one, its links stay and are recorded as
  `markUnresolved` (`noSameEditionName`).
- **Level evidence (LOO-38).** For legacy NPC revisions whose timer history
  shows another level for the same id and name, each link is compared with
  timer `CREATE` entries of the same NPC and edition within seven days of the
  loot. A single other level moves the link to a revision with that level;
  anything less certain keeps the stored level and is recorded (`noop`
  `timerConsistent`, or `markUnresolved` `bothLevelsObserved`,
  `severalOtherLevelsObserved`, `onlyOtherEditionEvidence`, `noDatedEvidence`).
  Relinks carry their access effect: `restrict` when the level rises,
  `expand` when it falls. Review `expand` entries before applying.
- **Backfill.** One entry fills `Loot.gameVersion` from the world where it is
  null.

Entry ids order execution: the backfill (`1:`), promotions (`2:`), relinks
(`3:`), records (`4:`). Saved notification selections come from the LOO-38
dry run as `5:` entries in the same format (`remapFilter` or `markUnresolved`
for a timer rule, `markUnresolved` for a watched item); the rule's filters are
never changed. Two plans of the same data are byte-identical.

### Manifest

One JSON decision per line, with the link ids of each entry in side files. An
entry's `rowIdsSha256` is the SHA-256 of its ascending link ids joined by
`\n`. Before anything is written, `apply` decodes every entry, requires
`manifestVersion` 2 and the `--run-id` given by the operator, verifies every
checksum and row count, and refuses two entries that move the same link or
change the same revision. Version 1 manifests, which created one NPC revision
per world, are refused.

When applied:

- A promotion stops if its revision changed since the plan, or if a revision
  with different attributes holds its hash. A revision with identical
  attributes that holds it, including one the API wrote after the plan, hands
  it over in the same transaction. Its links then move in batches, and the
  entry completes only once none are left and the swap is 60 seconds old, so a
  loot that resolved the retired revision just before the swap moves too.
- A relink recomputes the target hash with `createNpcSnapshotHash` or
  `createItemSnapshotHash`, checks that the target keeps the source's other
  attributes and, for items, its `statsHash`, rarity and level, and moves only
  listed links that still point at the source and whose loot is of the
  target's edition.

### Commands

From `apps/api`, with `POSTGRESQL_CONNECTION_URI` and the `REDIS_*` variables
of the API:

```sh
bun run repair:legacy-associations plan --out <dir> --run-id <runId>
bun run repair:legacy-associations apply --manifest <dir>/manifest.jsonl --run-id <runId>
bun run repair:legacy-associations status --run-id <runId>
bun run repair:legacy-associations rollback --run-id <runId>
```

`--batch-size` (default 1,000) sets the links moved or loots filled per
transaction and `--max-rows` (default 50,000) the rows changed per invocation.
Repeat `apply` or `rollback` until its JSON result reports `complete: true`.
Each result reports counts only, including the number of Organizations whose
caches were invalidated.

- **Bounded and resumable.** A batch locks its entry and the next links by id,
  moves them, writes their log rows and advances the entry cursor in one
  transaction. An interrupted run resumes after its last committed batch.
- **Idempotent.** A completed entry is skipped. A link already on the target
  counts as `alreadyOnTargetRows`; a link that points elsewhere is left alone
  and counts as `skippedRows`. Re-running a completed run changes nothing.
- **Rollback.** Entries are undone in reverse order. Only logged links that
  still point at their target move back (`restored`); a link changed since
  keeps its current revision (`kept`). A created revision is deleted only when
  no link references it, so a newer loot that reused it keeps it. A promoted
  revision gets its previous identity and stats back while it still carries
  the values the run set and no loot accepted since the promotion links it
  (a link above the highest link id at the swap, kept on the entry's
  cursor); otherwise it stays promoted (`kept`), so that loot's record does
  not change. A retired revision gets its hash back only after its promoted
  revision reverted.
  Unresolved selections recorded by the run are removed. A filled
  `Loot.gameVersion` stays: it was unknown, and the world determines it. A
  rolled-back run cannot be applied again; plan under a new run id.
- **Caches.** After each committed batch, the command bumps the `loots:list`
  and `loot-stats` generations and deletes the event-wrapped summaries of the
  Organizations whose links moved; after a promotion that changed item stats,
  of every Organization. Every `apply` and `rollback` first does the same for
  the Organizations already in the run's log, so a process stopped between a
  commit and its invalidation is healed by the next invocation. The public
  stats card counts item rarity, which the repair never changes. Kill
  statistics keep their own level copy and are not derived from loot links.

Lists, details, statistics, the activity feed, search results and notification
delivery all read the NPC level through `LootNpc` with one shared visibility
predicate, so they agree as soon as a batch commits. The repair publishes no
loot events and creates no notification jobs. Pending loot notifications
recheck source visibility before dispatch. A timer rule saved after a member
reselects an id rebuilds its jobs without announcing timers whose spawn window
has closed.

New submissions cannot recreate the repaired associations: every NPC and item
observation resolves by its edition hash, which the promoted and created
revisions hold. `test/legacy-repair.integration.test.ts` covers the plan,
apply, resume, a revision written after the plan, idempotency, rollback, cache
invalidation and the level cap of a restricted role.

### Rollout and rollback

1. Deploy the migrations, then search, then the API and Web. The new tables
   stay empty until a run is applied.
2. Run `plan` against production and compare its `summary.json` with the local
   dry run below. Keep the manifest and row files private.
3. Take a database backup or snapshot.
4. Run `apply` until `complete: true`, then `status`, and review the counters.
   The backfill rewrites every loot without an edition; give it a larger
   `--batch-size` and `--max-rows` and watch replication lag and table bloat.
5. From `apps/search`, run `bun run seed` to rebuild the NPC and item indexes.
6. Check a restricted role through the loot list, details, statistics and the
   feed for an NPC whose level changed.

To undo the data change, run `rollback` with a compatible API image until
`complete: true`, then rebuild the search indexes again. Rolling back the API
image alone leaves the repaired revisions in place; this is safe because they
are ordinary revisions. Do not drop the log tables while a run may need
rollback.

### Local dry run

On a copy of production restored on 2026-10-01 (13,803,407 loots, 22.1 million
`LootNpc` and 33.2 million `LootItem` links), `plan` took 35 seconds and wrote
44,928 entries:

| Domain | Action                                      | Entries |      Links |
| ------ | ------------------------------------------- | ------: | ---------: |
| Loot   | backfillGameVersion                         |       1 | 13,802,177 |
| NPC    | promoteRevision                             |   6,503 |          – |
| NPC    | relinkRevision                              |   2,480 |    288,426 |
| NPC    | noop (`timerConsistent`)                    |       2 |      5,875 |
| NPC    | markUnresolved (level evidence)             |      29 |    327,408 |
| Item   | promoteRevision (1,264 retiring a revision) |  28,745 |      2,018 |
| Item   | relinkRevision                              |     750 |     25,247 |
| Item   | markUnresolved (`noSameEditionName`)        |   6,418 |    335,814 |

The loot count is the number of loots without an edition; the promotion row
counts the links of retired revisions. Promotions keep 22.1 million NPC and
33.2 million item links in place. NPC relinks move 90,279 English and 3,057
Polish links of the other edition or of per-world revisions, and the level
evidence of 28 entries (one per legacy revision, edition and level, instead of
the 764 per-world revisions of the first LOO-38 dry run) moves 141,774 links
to a higher level (`restrict`) and 53,316 to a lower one (`expand`). Item
relinks give 18,985 Polish and 6,262 English links their edition's name. The
plan is byte-identical when repeated.

### Local validation

On a template copy of that database, with the local Redis and Meilisearch:

- `apply` backfilled 13,802,177 loots, promoted 6,503 NPC and 28,745 item
  revisions (17,872 of them without the first writer's per-instance stats),
  retired 1,264 item revisions into them with their 2,018 links, created 738
  NPC and 547 item revisions and moved 313,673 links, none already on target
  or skipped. Promotions and relinks took about five minutes; the backfill on
  the 2 GiB local container took about 40, so give production a larger
  `--batch-size`.
- An invocation killed with `SIGKILL` during the backfill left no loot
  without an edition before its cursor; the next invocation resumed. A
  repeated `apply` changed nothing.
- Afterwards no `LootNpc` link pointed at a revision without an edition or
  with a world, no NPC link differed from its loot's edition, and the only
  item links of another edition were the 335,814 recorded as unresolved.
- `bun run seed` took 45 seconds and produced 7,135 NPC documents, one per
  edition and identity, and 13,677 item documents. `tanro` returned Tanroth
  once per edition, each with a game version.
- `rollback` took three minutes, restored 315,691 links and all 36,512
  revision changes, and left the checksums of `LootNpc`, `LootItem`,
  `NpcSnapshot` and `ItemSnapshot` identical to the original. The filled
  `Loot.gameVersion` stayed.

These are local measurements, not production latency.
