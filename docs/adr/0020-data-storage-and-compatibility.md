# 0020. Data storage, caching and compatibility

Status: accepted

## Context

The API stores durable records in PostgreSQL and TimescaleDB through Drizzle,
caches reads in Dragonfly, and serves them through Effect HttpApi contracts
that generate OpenAPI specifications and clients. Drizzle and the PostgreSQL
driver lack some syntax and have encoding quirks, and the obvious builder
output sometimes plans a sequential scan across every Organization.

Stored rows, cache entries, hashes, slugs and records written by older Game
clients outlive the code that produced them. Statistics are counted in
Europe/Warsaw calendar time while timestamps are stored in UTC. These
decisions keep queries index-friendly, caches correct, and old data readable
without inventing values.

## Decisions

### Drizzle and driver constraints

- **`EventHeroKill_heroNpcId_killedAt_id_idx`** (`apps/api/src/database/drizzle/event.schema.ts`): descending index keys are declared `.desc().nullsFirst()` to match the null ordering of `ORDER BY ... DESC`. Drizzle's `.desc()` alone emits NULLS LAST, which stops PostgreSQL from reading the index without a sort.
- **`int4multirange`** (`apps/api/src/database/drizzle/loot.schema.ts`): the custom type declares a text codec, because without one the driver requests binary results and returns the raw wire bytes of a multirange.
- **`makeEventKillHistoryStore`** (`apps/api/src/events/history/event-kill-history.repository.ts`): the kill history page boundary is a tagged `sql` row comparison `(killedAt, id) < (...)`, because Drizzle has no row-value comparison and PostgreSQL seeks the full tuple in the ordering index only in that form.
- **`makeGuildLifecycle`** (`apps/api/src/guilds/guild-lifecycle.operations.ts`): guild upserts pass `banner` as possibly undefined on purpose. Drizzle skips undefined values in `set`, so a Discord event without a banner keeps the stored one.
- **`statsTimeZone`** (`apps/api/src/kills/kill-stats-period.ts`): the statistics time zone is inlined with `sql.raw` as a literal, because GROUP BY repeats the selected expression and PostgreSQL matches the two by text; bound parameters would make them differ.
- **`buildMonsterFights`** (`apps/api/src/loots/monster-fights.ts`): CTE columns stay table columns wherever possible, because Drizzle names an aliased expression without its CTE and the later joins become ambiguous.
- **`lootTimelineDate`** (`apps/api/src/loots/query/loot-stats-query.ts`): timeline points are native timestamps (the UTC instant for hours, Warsaw local midnight written in UTC for days and weeks), because both PostgreSQL drivers decode native timestamps and a column codec would add a costly text cast. The query groups by the timestamp expression, not the selection alias, because the driver's selection applies a text cast that must not become the grouping key.
- **`buildUserCaughtItemsQueries`** (`apps/api/src/loots/query/loot-stats-query.ts`): empty id arrays are omitted from `= ANY($1::int[])` conditions instead of being bound, because the driver cannot type an empty array parameter.

### Query planning

- **`accessibleGuildsQuery`** (`apps/api/src/members/member-access-query.ts`): role grants resolve to an array of Organization ids first, so owner and role grants both reach `Guild` through `Guild_ownerId_idx` and the primary key. It uses tagged `sql` for `= any(array(subquery))` because the builder has no such operator, and both an OR across a left-joined role and `inArray`'s `IN` semi-join planned a sequential scan of every Organization.
- **`alreadyDelivered`** (`apps/api/src/notifications/jobs/notification-job-scheduler.ts`) and the notification job repository (`apps/api/src/notifications/jobs/notification-job.repository.ts`): jsonb `@>` containment and the `maxSpawnTime` accessor use tagged `sql`, because Drizzle has neither operator.
- **`notificationLootSourceCondition`** (`apps/api/src/notifications/notification-loot-source-visibility.ts`): `sourceEntityId` is cast to bigint only after a regex check, which keeps the indexed `Loot.id` uncast and rejects malformed legacy identifiers before the cast can fail.
- **`takeKeysetPage`** (`apps/api/src/shared/keyset-page.ts`): list endpoints page by keyset over a unique key (sort column plus row id). The opaque cursor carries the filters it was issued for, so replaying it with other filters is rejected instead of skipping or repeating rows.
- **`makeDeleteTimer`** (`apps/api/src/timers/timer-delete.data-layer.ts`): deleting an already deleted timer returns early, because every update rewrites the Timer indexes and adds a redundant history entry.
- **`makeTimerHistory`** (`apps/api/src/timers/timer-history.data-layer.ts`): history orders by `id::bigint` descending, which keeps insertion order without letting the planner scan other Organizations through the primary key.
- **Member sync rollback test** (`apps/api/src/members/member-sync.operations.test.ts`): the test adds a constraint with raw `ALTER TABLE` through `database.execute`, because Drizzle has no DDL builder and a real constraint is the only way to reject one write through the real transaction boundary.

### Read caching and coalescing

- **`getOrSetJson`** (`apps/api/src/redis/redis.service.ts`): a value is filled once across all API processes. Cache failures fall back to the factory, only factory errors surface, and a waiter past `waitTimeoutMs` fails with `CacheFillTimeoutError` rather than starting a second fill. Scope generations are captured before loading, so a fill invalidated while in flight is written under an unreachable key.
- **`READ_CACHE_GENERATION_TTL_SECONDS`** (`apps/api/src/redis/redis.service.ts`): scope generations expire unless reads renew them, and a missing scope gets a new random token, so expiry can never make an old fill reachable again.
- **`getOrSetStaleJson`** (`apps/api/src/redis/stale-json-cache.ts`): an entry is served until `retainSeconds` and refreshed in the background past `freshSeconds` by a single lease holder. Readers wait only for a missing entry, and a failed refresh keeps the old entry until the lease expires.
- **`FRESH_SECONDS`** (`apps/api/src/loots/query/loot-stats.service.ts`): `LootStatsService` serves statistics for up to 3 hours and recomputes them in the background, because they scan an Organization's whole loot history. Responses carry the computation time, so stale numbers are visible.
- **`makeCharacterAurasCache`** (`apps/api/src/runtime/features/character-auras.ts`): aura writes invalidate the list cache, and its TTL covers only changes writes cannot see, such as a newly proved account of a User who shows an aura. Every aura and grant write invalidates the holders cache, whose TTL bounds only a failed invalidation; its key carries a `personal` suffix because entries stored before personal grants would not decode.
- **`getGuildMemberReferencesCacheKey`** (`apps/api/src/shared/cache.ts`): the key carries `v2`, so entries cached before the profile fields were added are never decoded.
- **`CachedTimerProjection`** (`apps/api/src/timers/timer-projection.ts`): `entranceClosesAt` is optional, because projections cached before Hero Trackers lack it.
- **`makeLootsOperations`** (`apps/api/src/loots/loots.operations.ts`): shared in-flight loot detail reads (`pendingDetails`) release their key only from the newest run. `Effect.cached` starts a new run after every caller abandons the previous one, so an older run releasing the key would drop the newer flight.

### Dragonfly and Redis layouts

- **`APPEND_SCRIPT`** (`apps/api/src/runtime/features/global-chat.ts`): global chat scores messages by an incrementing counter, not time, so a page cursor keeps pointing at the same message while new ones arrive and old ones are trimmed, and messages sent in the same millisecond keep their order.
- **`REPLACE_SCRIPT`** (`apps/api/src/runtime/features/chat.ts`) and **`FIND_SCRIPT`** (`apps/api/src/runtime/features/global-chat.ts`): moderation scans the bounded kept messages instead of maintaining an id index, because moderation is rare.
- **Dragonfly flags** (`apps/api/test/bun.e2e.global-setup.ts`): Dragonfly runs with `--cluster_mode=emulated` and `--lock_on_hashtags` in production and tests, because BullMQ scripts touch undeclared `{bull}` keys.

### Retention and account deletion

- **`makeTimersCleanup`** (`apps/api/src/timers/timers-cleanup.ts`): a manual timer ends with its window. Cleanup deletes it, deleted or not, together with the history that could restore it, in one transaction.
- **`makeUserAccountDeletion`** (`apps/api/src/users/user-account-deletion.data-layer.ts`): kill buckets from the current hour on are deleted immediately in the uncompressed chunk, so kills after a returning member's reactivation are never purged. Older buckets are left to the off-peak member kill purge, because deleting them would decompress each chunk's Organization segment and write hundreds of MB of WAL.
- **`makeUserAccountDeletion`** (`apps/api/src/users/user-account-deletion.data-layer.ts`): deletion sets `timescaledb.max_tuples_decompressed_per_dml_transaction` to 0, because personal kill buckets are segmented by Discord id and TimescaleDB can delete their compressed batches without decompressing.
- **`makeUserAccountDeletion`** (`apps/api/src/users/user-account-deletion.data-layer.ts`): personal notification data is deleted by Discord id, because personal notifications are keyed by it, and deleting rules and targets cascades to their links and pending jobs.

### Persisted identifiers, slugs and hashes

- **`truncateAtSecondSeparator`** (`packages/domain/src/item-stat.ts`): stat values are still cut at a second `=`, as the game client reads them, because persisted and indexed projections were built that way.
- **`ITEM_INSTANCE_STAT_KEYS`** (`packages/domain/src/item-stat.ts`): `created`, `gold`, `amount` and `opis` vary per instance, so `splitItemStat` stores them with the looted instance and never with the shared item revision, which keeps revisions deduplicated.
- **`createItemSnapshotHash`** and **`createNpcSnapshotHash`** (`packages/database/src/snapshot-hash.ts`): the hashes define revisions. An item revision is edition, name, icon, type and revision stats, ignoring per-instance stats and stat order; an NPC revision is keyed by edition, not world, because every world of an edition shares NPC ids. The NPC hash input (prefixed `npc-observation-v2`) is a persisted contract shared by the API writer, the seed writer and the repair, so changing it splits new observations from every stored revision.
- **`RESTRICTED_VANITY_URLS`** (`packages/domain/src/organization-vanity-url.ts`): `battles` is reserved, because that public Web route cannot also address an Organization.
- **`isOrganizationIdLike`** (`packages/domain/src/organization-vanity-url.ts`): every all-digit slug, whatever its length, stays in the Discord snowflake id namespace, so a vanity URL is never confused with an Organization id.
- **`normalizeVanityUrl`** (`packages/domain/src/organization-vanity-url.ts`) and **`slug`** (`packages/domain/src/text-fold.ts`): slugs keep their exact output, including not folding diacritics (`Łódź` becomes `d`), because vanity URLs are stored and catalog slugs are wiki URLs.
- **`GameVersion`** (`packages/schema/src/game-version.ts`): `pl` or `en`, the game's `CFG.LANG`, namespaces catalog identities independently of `world`. The client declares it, so the API validates it but cannot verify it.

### Records from older clients

- **Kill request `party`** (`apps/api/src/contracts/kills/schemas.ts`): the field stays optional because older deployed Game clients omit it. It decides how many times a boss's loot is rolled, so consumers must handle its absence.
- **`gameVersionEnum`** (`apps/api/src/database/drizzle/loot.schema.ts`): a NULL game version means unknown (an older Game client or an unrecognized host) and is never read as `pl` or `en`.
- **`NpcSnapshot`** (`apps/api/src/database/drizzle/loot.schema.ts`): snapshots in the `legacy` `identityNamespace` come from Game clients that sent an overloaded NPC id, so their id meaning is never inferred or migrated into another namespace.
- **`makeKillCreation`** (`apps/api/src/kills/kill-creation.ts`): older Game clients report only the character id, so the kill character upsert keeps the last known name, level and profession when a report carries none.
- **`getKillRespawnTiming`** (`apps/web/src/features/guild/events/components/kills/kill-detail-summary.tsx`): stored respawn durations win, with the window timestamps as a fallback, because older persisted kills have no stored durations.
- **`StatisticsActivity`** (`apps/web/src/features/user/statistics/statistics-activity.tsx`): with a world selected, a day's online time is unknown unless `worldsComplete`, because older Game clients reported sessions without their world.
- **`StatisticsCharacterSelect`** (`apps/web/src/features/user/statistics/statistics-character-select.tsx`): a tracked character's details are filled from the battle log, because older Game clients reported kills without the character's name and level.

### Time zones

- **`PgClientLive`** (`apps/api/src/database/drizzle/database.ts`): sessions run with `timezone: "UTC"`, because most columns are `timestamp` without time zone holding UTC, and `now()` defaults and comparisons with `timestamptz` columns follow the session zone.
- **`MARGONEM_TIME_ZONE`** (`apps/api/src/kills/kill-stats-period.ts`): loot and kill statistics count days, weeks and hours in Europe/Warsaw, where Margonem's Polish worlds and their players live, while buckets are stored by UTC hour.
- **`getKillAnalyticsRange`** (`apps/api/src/kills/user-kill-analytics-query.ts`): the range end is rounded to the hour as an instant, not a local wall hour, so the repeated autumn DST hour stays distinct.
- **`formatStatisticsDate`** (`apps/web/src/components/common/kill-analytics/format-statistics-date.ts`) and **`LootTimelineChart`** (`apps/web/src/components/common/loot-stats/loot-timeline-chart.tsx`): calendar dates arrive already resolved in Polish time and written as UTC midnight, so they are formatted in UTC; formatting them in a local or Warsaw zone would shift the day. Hourly points are instants and are formatted in `MARGONEM_TIME_ZONE`.
- **`toUtcDateFromLocal`** (`packages/datetime/src/index.ts`): the conversion is hand-written. A skipped wall-clock time moves past the DST gap and a repeated one resolves to its second occurrence; `@date-fns/tz` picks the first occurrence, shifting scoring and notification windows on the fall-back day, and Effect `DateTime` adds about 22 kB to the Web bundle for the same `Intl` technique.

### HTTP contracts

- **`GlobalChatMessagesResponse`** (`apps/api/src/contracts/global-chat/schemas.ts`): nullable response parts such as `pinned` are inline structs (`Schema.Struct(X.fields)`), because OpenAPI 3.0 ignores `nullable` beside a `$ref` and generated clients would treat the value as non-null.
- **`ClaimHeroSightingRequest`** (`apps/api/src/contracts/hero-sightings/schemas.ts`), **`MAX_MEMBER_ID`** (`apps/api/src/contracts/shared.ts`) and **`MAX_TIMER_NPC_ID`** (`apps/api/src/contracts/timers/schemas.ts`): ids backed by PostgreSQL `integer` columns are bounded in the request schema, so an oversized id fails validation with a 400 instead of failing the query with a 500.
- **`EventWrappedHeroCoverageDto`** (`apps/api/src/events/wrapped/event-wrapped.model.ts`): event wrapped DTOs are type aliases, not interfaces, because the response schema allows extra JSON keys and only a type alias is assignable to that index signature.
- **`EventsHandlers`** (`apps/api/src/http-api/handlers/events/events.handlers.ts`): the spread order of the handler groups is the route registration order, so it is kept when groups are added or moved.

### HTTP error contract

- **`HttpErrorResponse`** (`packages/protocol/src/http/errors.ts`): every 4xx and 5xx body has this shape. `code` is the stable machine-readable reason, `message` is human text that may change, `details` carries explanation values, and a 429 sends `Retry-After` when known. Only the `ReauthenticationRequired` 401 differs.
- **`applicationErrorHttpResponse`** (`packages/protocol/src/http/errors.ts`): errors are answered explicitly, because every declared error status shares one schema and a failure value cannot select its status. Non-application and internal errors become logged 500 defects, and dependency failures hide their message.
- **`reauthenticationRequiredResponse`** (`packages/protocol/src/http/errors.ts`): the 401 is answered explicitly, because HttpApi encodes a failure with the first accepting error schema and an open `HttpErrorResponse` 401 would claim it and drop `requiresReauth`.
- **`layerSchemaErrorTransform`** (`packages/protocol/src/http/schema-error-response.ts`): request validation errors become a successful 400 response rather than a failure, which an open 401, 403 or 404 schema could claim. `Body` and `ResponseHeaders` errors still fail, because a response that does not match its own schema is a server defect.

## Consequences

- Tagged `sql` appears only where the builder lacks the syntax or plans badly; a new use needs the same justification and a checked plan.
- A change to a cached value's shape needs a new key version or optional fields, because entries outlive deployments.
- Snapshot hash inputs, slugs, vanity URL rules and item stat projections are persisted contracts; changing them requires a data migration.
- Fields that older Game clients omit stay optional, and readers show them as unknown instead of zero or a guess.
- Time handling has two rules: store and compare in UTC, count calendar periods in Europe/Warsaw.
- New error responses go through the shared helpers instead of relying on HttpApi's first-matching-schema encoding.
