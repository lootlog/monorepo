# API database migration evidence

`legacy-prisma/` is the immutable archive of the Prisma schema and every Prisma
migration deployed before the Drizzle adoption. It is the only retained Prisma
artifact and exists solely as physical-schema evidence.

Verify the archive from the repository root with:

```sh
shasum -a 256 -c apps/api/drizzle/legacy-prisma.sha256
```

`legacy-prisma-schema.sql` is the deterministic Prisma datamodel DDL generated
with `prisma migrate diff`. It is retained for mechanical comparison.

`migrations/20260901121000_legacy_prisma_baseline/migration.sql` is the Drizzle
baseline for a new empty database. It includes the reservation checks that were
introduced by handwritten Prisma migrations and therefore are absent from the
Prisma datamodel DDL.

An existing database is never marked as adopted merely because tables exist.
The adoption routine compares tables, columns, physical types, nullability,
database defaults, enum labels, index names, and constraint names with the
generated expected catalog. Any missing, additional, or changed catalog object
aborts the transaction before the baseline migration is recorded.

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
