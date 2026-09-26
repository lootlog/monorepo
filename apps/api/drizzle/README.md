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
revision by its identity namespace, world, supplied NPC id, name, derived NPC
type, level, icon, profession, weight, and Margonem type. Missing and null
optional attributes are equivalent; empty strings and zero remain distinct
values. The name participates in revision identity, so a rename creates a new
revision. Returning to an identical observation reuses its existing revision.
This model has no mutable latest-NPC record for a delayed submission to regress.
Retrying an already accepted loot keeps its original snapshot associations.

The current namespace is `legacy`. Deployed clients overload `id`: normal
battle loot may supply a template id, while fallback and dialog loot may supply
a runtime id. The namespace records this uncertainty; it does not assert that
equal numbers identify the same template or establish a mapping between runtime
and template ids. World separates new observations across worlds without
claiming a game-version identifier. Explicit runtime/template identity and
game-version provenance remain the work of
[LOO-33](https://linear.app/lootlog/issue/LOO-33) and
[LOO-35](https://linear.app/lootlog/issue/LOO-35).

`20260924232451_npc_observation_revisions` adds `identityNamespace` with default
`legacy`, nullable `world` and `snapshotHash`, and replaces `NpcSnapshot_npcId_name_key` with
`NpcSnapshot_npcId_snapshotHash_key`. Existing rows retain their attributes and
`LootNpc` associations; their world and hash stay null because the migration
cannot recover the original observation or identity provenance. New submissions
use hashed revisions, including when their attributes match an unhashed legacy
row. The API acceptance writer and CLI seed writer share the revision function.
The existing name and type/level indexes remain available to readers.

NPC search publications carry the optional `snapshotHash`. The search consumer
stores each hashed observation under a separate document id, so delayed or
retried delivery cannot replace another revision. It preserves an accepted NPC
type; classification from weight remains a fallback for legacy type values.
Events without a hash continue to write their existing catalog document. The
search rebuild script retains hashed revisions and selects one legacy snapshot
per legacy document id; running that script does not recover missing history.

Public NPC search remains a catalog of suggestions with the existing NPC ids.
Every indexed document carries an internal `catalogKey` for its id, Margonem
type, and world. Search uses Meilisearch's
[`distinct` parameter](https://www.meilisearch.com/docs/reference/api/search/search-with-post)
to group those documents before the requested hit limit. A large revision
history for one NPC cannot consume the slots for other catalog identities,
including requests that resolve several selected NPC ids. The existing
name/type collapse still applies after catalog grouping. Search ranking chooses
the displayed suggestion; it is not a current-level authority or a source of
loot access decisions. Neither hash order nor the highest observed level
establishes chronology. Catalog identity changes and saved notification
selection remain separate work under LOO-33 and LOO-37.

Deploy this change with a coordinated writer transition:

1. Stop routing new loot writes to the old API revision and let in-flight
   requests finish. Stop old seed/import jobs that write `NpcSnapshot`, then
   stop old search instances so their consumers cannot write documents without
   catalog grouping metadata during the transition. Retain queued publications.
2. Apply the migration with `bun run db:migrate:deploy`. The migrator runs in a
   transaction; schedule the unique-index replacement for a window that allows
   the required table locks.
3. From `apps/search`, run `bun run backfill:npc-catalog` with the existing
   `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY`. Each run updates at most 10,000
   documents in acknowledged batches of 500. Repeat until its JSON result says
   `complete: true`. The command adds only missing `catalogKey` values, preserves
   every existing document and attribute, and safely resumes after interruption.
   Complete this step before enabling the new search queries; legacy documents
   without the grouping field cannot participate in the same distinct group.
4. Deploy the new search service before the new API publisher. Its startup
   settings make `catalogKey` and `id` filterable, and it accepts both hashed and
   older events. Its index writes and the updated rebuild script include the
   grouping field. Run that rebuild script only after the database migration.
5. Start only API and seed/import revisions that target the new snapshot key,
   then resume ingestion. Old writers use `ON CONFLICT (npcId, name)` and cannot
   run after the old unique index is removed.
6. Verify that new loots reference rows with non-null world and hash, and that
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
