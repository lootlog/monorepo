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

`20260920134427_loot_search_trigram_indexes` installs `pg_trgm` and adds
`Loot_location_trgm_idx` and `PlayerSnapshot_name_trgm_idx`. `pg_trgm` is a
trusted extension, so the database owner can install it without superuser
rights. Apply the migration before deploying the API revision that resolves
search terms; an older revision ignores both indexes.

`makeLootQueryPersistence` resolves a search term before the page query. It
asks, concurrently, which `ItemSnapshot`, `NpcSnapshot` and `PlayerSnapshot`
ids match the term and whether any `Loot` location can match it. Each relation
then contributes an arm only when it can still match, using the resolved
snapshot ids instead of a correlated name join. A term that matches nothing
anywhere skips the page query and returns no rows.

The previous condition ORed four correlated subqueries that read a snapshot row
and ran `ILIKE` for every loot the descending scan examined, so a term matching
nothing paid for the whole Organization before returning nothing. Measured on a
local production copy (13,403,753 loots; the largest Organization holds 383,683
nonarchived records; `shared_buffers` 512 MiB, parallel query disabled), a
no-match term exceeded a 60 s statement timeout; after the change the same
request resolves in about 11 ms of database time and runs no page query. These
are local fixture measurements, not production latency.

A term matching more than `LOOT_SEARCH_SNAPSHOT_LIMIT` snapshots of one
relation keeps that relation's original pattern arm: such a term matches
densely, so the descending scan reaches its page early. Case-insensitive
substring semantics, Organization isolation, archival, visibility, ordering and
filter combinations are unchanged; the resolution queries use the same `ILIKE`
patterns the arms used before.

Index sizes on that copy: `Loot_location_trgm_idx` 537 MB and
`PlayerSnapshot_name_trgm_idx` 36 MB. Loot ingestion adds one GIN entry per
inserted row in each; the copy received at most about 30,000 loots per day
during the sampled week.

The migrator runs inside a transaction, so these are plain `CREATE INDEX`
statements holding a `SHARE` lock that blocks loot inserts while they build.
Applying the migration to that copy took about 50 seconds end to end. Loot
acceptance waits for the lock rather than failing, and its publication intents
survive a restart, but apply the migration when ingestion is quiet.
