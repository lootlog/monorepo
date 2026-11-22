# 0016. Loot and kill records

Status: accepted

## Context

Every party member's Game client reports the same loot, kill and timer,
often for several Organizations at once, and requests are retried after
partial failures. Accepted records must be stored once per destination,
without deadlocks between overlapping writers, and readers must see records
that agree with the loot or kill they came from.

The Organization loot list, user feed and statistics are the API's heaviest
reads. Their storage shape and index design come from plans measured on a
production copy, so they are persisted contracts that writers and migrations
must keep consistent.

## Decisions

### Loot acceptance

- **`resolveLootAcceptance`** and **`LootAcceptanceInput`** (`packages/domain/src/loot-acceptance.ts`): the Game client and the API run the same rules, and every `undefined` input means unknown and never rejects. The API passes everything it loads while the client passes only the catching scope it holds, so the client skips only submissions the API would also reject. `loot.rarities` is a thunk called only for an Organization whose config covers the NPC type, so the client parses item stats only when needed.
- **`getFreshCharacterCatchingGuildIds`** (`apps/game-client/src/hooks/api/use-lootlog-characters-config.ts`): the catching scope is `undefined` while its load is pending or failed, a save is in flight, or a failed save was rolled back, because the API may know a scope the cache has not confirmed. The scope comes from the character configuration endpoint, which already drops Organizations where the User cannot write loot.
- **`useUpdateLootlogCharactersConfig`** `onError` (`apps/game-client/src/hooks/api/use-update-lootlog-characters-config.tsx`): a failed save restores its snapshot stamped `updatedAt: 0` and refetches, because the snapshot may hold an earlier failed optimistic write.
- **`resolveAcceptance`** (`apps/game-client/src/processors/loot-event-processor.ts`): the client skips a submission only when the API would reject it for every Organization, because a wrong skip silently loses accepted loot.
- **`RejectedLootMemory`** (`apps/game-client/src/processors/rejected-loot-memory.ts`): members cannot read Lootlog settings, so acceptance is learned from API refusals. A refusal is keyed by catching scope, NPC type set and item rarities until it expires, and also covers loot with a subset of those rarities, because a Lootlog accepts loot when at least one rarity is allowed and the same NPC type set always has the same strongest NPC.

### Loot submission and snapshots

- **`resolveSnapshotIds`** (`apps/api/src/loots/submission/loot-snapshot.repository.ts`): resolves a batch in at most three statements (select, insert, select) and returns one id per input in input order. It stores the first submitted variant of a key and inserts keys sorted, so overlapping submissions lock keys in one order; the final READ COMMITTED select sees a row a concurrent submission committed first.
- **Loot acceptance transaction** (`apps/api/src/loots/submission/loot-submission-acceptance.repository.ts`): resolves snapshot tables in a fixed order (items, players, NPCs) and all participant and map characters in one sorted batch, so concurrent loots cannot deadlock. `readLootFacts` reads the facts each record denormalizes from `Loot` inside the transaction, never from the caller.
- **`captureLootMapPlayers`** (`apps/api/src/loots/submission/loot-map-players.repository.ts`): requires the caller to hold its locks and run the whole capture in one transaction.
- **Player snapshots** (`apps/api/src/shared/margonem/player-snapshot.repository.ts`): new snapshots use a versioned `v2:` structured hash that cannot collide with legacy concatenated hashes, inserted in one ordered batch.
- **`toNpcSpawnPositions`** (`apps/api/src/npc-spawns/npc-spawn-positions.ts`): sorts spawn tiles by key so concurrent upserts lock rows in one order; older clients that report no map id or tile contribute nothing.
- **`resolveItemSnapshotIds`** and **`resolveNpcSnapshots`** (`apps/api/src/loots/submission/loot-snapshot.repository.ts`): any observed change, including a localized name, rename or icon, creates a new immutable revision. One NPC revision serves every world of an edition; `world` stays null on new revisions while the loot keeps its world.
- **`mapLootNpcsToPersistence`** (`apps/api/src/loots/submission/loot-submission-normalization.ts`): normalizes NPC icons with `normalizeNpcIcon`, because senders may report the rendered CDN URL and a revision must not depend on the form a sender chose.

### Loot list storage and queries

- **`OrganizationLootRecord`** (`apps/api/src/database/drizzle/loot.schema.ts`): copies the loot's immutable world and creation time as NOT NULL columns and denormalizes `lootRarityMask`, `npcTypeMask` and `npcVisibility`, so the list filters on this table alone; the join to `Loot` was 80% of a page's buffers. A data migration that changes a loot's items or NPCs, or a snapshot's rarity, type or level, must rewrite these columns.
- **`OrganizationLootRecord_guildId_world_lootId_page_active_idx`** (`apps/api/src/database/drizzle/loot.schema.ts`): is keyed by `(guildId, lootWorld, lootId DESC NULLS FIRST)` with the masks and visibility as trailing keys, so a selective filter is an index-only scan. `archivedAt IS NULL` is the partial predicate because PostgreSQL does not treat `IS NULL` as an ordering equality, and `.nullsFirst()` must match `ORDER BY "lootId" DESC`.
- **`OrganizationLootRecord_createdAt_brin_idx`** (`apps/api/src/database/drizzle/loot.schema.ts`): the user feed's 24-hour window uses a BRIN index because records are appended in creation order; a `(guildId, createdAt)` btree would cost 748 MB.
- **`LOOT_RARITY_BIT`** and **`NPC_TYPE_BIT`** (`apps/api/src/loots/loot-record-facts.ts`): bit values are persisted in every mask, so a bit is never renumbered or reused. Every writer spreads `organizationLootRecordFactsOf` and `lootNpcVisibilityOf`, computed from the loot's own rows, so the items and NPCs must be written before the record.
- **`npcVisibility`** encoding (`apps/api/src/loots/loot-visibility.ts`): one integer per NPC, its level shifted by `NPC_LEVEL_SPAN` per visibility class, makes visibility a single multirange containment test. The encoding is persisted and never changes; an NPC without level or type maps to the never-granted key -1.
- **`LootQuerySource`** (`apps/api/src/loots/query/loot-query-filter.ts`): both `Loot` and `OrganizationLootRecord` carry loot id, world and creation time, so the id page drives from the record and never joins `Loot`, while queries reading other loot columns drive from `Loot`.
- **`lootIdIn`** (`apps/api/src/loots/query/loot-query-filter.ts`): NPC and item filters use `lootId = any(array(subquery))` instead of a correlated EXISTS (up to 1M buffers) or Drizzle's `inArray` semi-join (4x the buffers); tagged `sql` is needed because the builder has no `= ANY(ARRAY(subquery))`.
- **`searchRelationArm`** (`apps/api/src/loots/query/loot-query-filter.ts`) and **`resolveSearch`** (`apps/api/src/loots/query/loot-query.repository.ts`): free-text search resolves the term to snapshot ids the loot list owns and adds arms only for relations that can still match. It is the fallback for names the search service has not indexed, so a stale index never hides a loot. A term matching more than `LOOT_SEARCH_SNAPSHOT_LIMIT` snapshots keeps the pattern, because it matches densely enough for the scan to stop early.
- **Loot statistics `npcTypes` filter** (`apps/api/src/loots/query/loot-stats-query.ts`): binds one typed array parameter (`= ANY($1::"NpcType"[])`), because expanded IN values changed join estimates on production-sized data.

### Loot allocation and draws

- **Chat allocation** (`apps/api/src/loots/allocation/loot-allocation.operations.ts`): Margonem omits items every player rejected from the loot share message, so a share may cover some items or none. When it covers none the allocation is kept, and the empty response tells the client the message may belong to an older loot.
- **`allocationAuthorization`** (`apps/api/src/loots/allocation/loot-allocation.repository.ts`): a chat allocation is authorized as a game fact the actor witnessed: they submitted the loot recently in an Organization where they may write and see it. Write access everywhere is not required, because mixed parties record one loot in Organizations the actor is not in. The first allocation wins.
- **`lootDrawWinnerTickets`** (`packages/domain/src/loot-draw.ts`): draws exist because a party holds ten players. The catcher enters with one ticket per party member of a wearing profession, since the game already drew among them; outsiders of such a profession get one ticket, and once party members enter themselves the catcher drops to one.
- **`isLootDrawItem`** (`packages/domain/src/loot-draw.ts`): draws only legendary items that are not `permbound` (the winner could not receive them) and not from an NPC type the Organization excludes. `findLootItemOwner` treats the only player of a solo loot as its catcher, because Margonem leaves the share empty for solo loots.
- **`lootDrawLandingOffset`** (`packages/domain/src/loot-draw.ts`): derives the landing spot from the draw id, so every wheel and card showing one draw stops at the same place.
- **`LootDraw_organizationLootRecordId_itemHid_active_key`** (`apps/api/src/database/drizzle/loot.schema.ts`) and **`createDraw`** (`apps/api/src/loots/loot.repository.ts`): a partial unique index keeps one standing draw per item, and draw creation locks the Organization loot record, so concurrent or retried draws give one result and one conflict.
- **`createLootDraw`** (`apps/api/src/http-api/handlers/loots/loots.handlers.ts`) and **`LootDrawDialog`** (`apps/web/src/features/guild/loots-list/components/loot-draw/loot-draw-dialog.tsx`): anyone who may read a loot may draw its items unless the NPC type is excluded; voiding requires the loot management capability (`canVoid`).
- **`useLootDrawRules`** (`apps/web/src/features/guild/loots-list/components/loot-draw/use-loot-draw-rules.ts`): treats nothing as drawable until settings load, so an excluded boss never flashes a wheel, but keeps a standing result visible after its type is excluded so it can still be voided.
- **`useLootDraws`** (`apps/web/src/features/guild/loots-list/components/loot-draw/use-loot-draws.ts`): refreshes the draw history after every create or void and treats it as the truth; a 409 means another Member drew first.

### Kill submission

- **`writeKill`** and kill dedup claims (`apps/api/src/kills/kill-creation.ts`): every Redis claim is released unless the single write transaction commits, so a retry can write what a failure rolled back. Personal and Organization claims run independently and both finish before results are read, and a failed personal dedup still prevents every Organization write.
- **Kill write order** (`apps/api/src/kills/kill-creation.ts`): personal rows first, then each Organization in id order, then shared boss rows, so no transaction holds a shared row while waiting for another's.
- **`recordBossKill`** and **`bossKilledAt`** (`apps/api/src/kills/kill-creation.ts`): every report of one boss kill takes the first report's time from a shared Redis key (`buildBossKillDedupKey`), and adding an Organization again changes nothing, so the kill is recorded once in `BossKill`. The first report naming the party fills the party columns via `coalesce`.
- **`incrementUser`** (`apps/api/src/kills/kill-creation.ts`): writes account-wide and per-character rows together, so a kill counts for its character exactly when it counts for the account.

### Kill statistics storage

- **`guildKillDayTable`** (`apps/api/src/database/drizzle/kill-statistics.schema.ts`): a Europe/Warsaw daily rollup written with `GuildKillBucket`, so all-time timelines and the heatmap avoid hourly buckets. `hours` always has 24 slots (a repeated DST hour shares its slot), and it has no foreign key to `Guild` because one would lock `Guild` on every kill.
- **`userKillTotalTable`** (`apps/api/src/database/drizzle/kill-statistics.schema.ts`): lifetime totals index only the natural key and use fillfactor 70, so per-kill increments stay heap-only tuple updates.
- **`memberKillPurgeTable`** and **`makeMemberKillPurge`** (`apps/api/src/kills/member-kill-purge.ts`): a deleted account's buckets are purged by a nightly job one TimescaleDB chunk per transaction, touching only chunks with its rows, because deleting from a compressed chunk decompresses the Organization's whole segment. A one-hour lease keeps each member on one replica.
- **`GUILD_KILL_STATS_FRESH_SECONDS`** (`apps/api/src/kills/kill-query-support.ts`): Organization kill statistics scan the whole history, so they are served stale-while-revalidate for an hour; kills deliberately do not invalidate them.

### Event kills and rankings

- **`recordKill`** (`apps/api/src/events/kills/event-kill.repository.ts`): the database, not Redis, is the authority for one kill per respawn window.
- **Hero lock order** (`isHeroNameTaken`, `updateHero`, `deleteHero` in `apps/api/src/events/catalog/event-catalog-mutations.ts`; kill ranking writes in `apps/api/src/events/coordination/event-participation.ts`; `addKillToRankings` in `apps/api/src/events/kills/event-points.repository.ts`): rankings are keyed by hero name, so name assignment locks the event row, a rename locks the hero and moves rankings in place to keep their ids, and deletion removes them explicitly. Ranking writes take a share lock on the hero before the kill point lock, the same order as deletion, so a rename or delete either waits or has already happened.
- **`planHeroListUpdate`** (`apps/api/src/events/catalog/event-update.ts`): matches heroes by name and maps by id so retained ones keep their history, and never removes heroes or maps, because removal deletes kills and points and belongs to the delete endpoints. The update reads heroes `FOR SHARE` until commit.
- **`addKillToCurrentRanking`** and **`addRankingRows`** (`apps/api/src/events/kills/event-points.repository.ts`): upserts add the proposed row to the current one inside `ON CONFLICT`, so concurrent kills accumulate, and rows are sorted by member id so they lock in one order. The AFK average is a running average rounded to two decimals.
- **`resolveManualAdjustmentPoints`** (`apps/api/src/events/kills/event-point-recalculation.ts`) and **`KILL_POINT_ADJUSTMENTS_TRACKED_SINCE`** (`apps/api/src/events/kills/event-ranking-policy.ts`): manual adjustments come from edit history, because an earlier recalculation wrote unrecorded adjustments into the column; edits older than tracking are carried on the ranking.
- **`analyzeEventKillPresence`** (`packages/domain/src/scoring-presence.ts`): live scoring, recalculation, breakdowns and the simulator all use it, with half-open `[start, end)` intervals, so identical intervals give identical points. A participant without any presence record is reported as missing data (`hasData: false`), never as absent, and `resolveEventScoringWindow` reports an unreliable start as `null`.
- **`explainEventScoring`** (`packages/domain/src/scoring.ts`): a later matching base rule replaces earlier ones while bonuses accumulate; without presence analysis, presence conditions never award points.
- **`summarizeSpawnWindowAssignments`** (`apps/api/src/events/wrapped/event-wrapped.service.ts`): computes coverage in one sweep; `SweepStep` orders same-timestamp events so both bounds are inclusive.

### Timers

- **`writeGuildTimer`** (`apps/api/src/timers/timer-auto-guild-write.ts`): concurrent and retried reports of one kill share one stored timer, and the dedup entry is written only after publication succeeds, so a retry republishes.
- **`persistAutoTimer`** (`apps/api/src/timers/timer-auto.repository.ts`): identifies a committed automatic submission only by its recent CREATE history entry and returns `Unpublished` for it, because the transaction can commit before Redis records the result. `insertEventHeroCheck` commits the event hero check in the timer's transaction.
- **`respawnFromSpawnWindow`** (`packages/domain/src/timers.ts`): encodes a window as integer `respBaseSeconds` ± `respawnRandomness` with up to a second plus half a percent of drift; older rows keep the same semantics, so no migration rewrites them.
- **`canResetTimerNpc`** and **`SAME_HERO_TRACKER_ENTRANCE_TOLERANCE_MS`** (`packages/domain/src/timers.ts`): Hero Tracker timers cannot be reset because their window comes from the entrance countdown the game reports. Reports of one entrance match within 60 s, since they differ only by latency or an older client's clock.
- **Hero Tracker reports** (`apps/api/src/timers/timer-auto-report.ts`): `hasTimerWeight` admits trackers by name because their templates carry no weight; `getReportedEntranceClosesAt` puts the countdown on the server clock; `getEntranceRespBaseSeconds` keeps a base observed on this world over the public default older clients send; `findSameEntranceTimer` treats an entrance already counted as the same timer.
- **`MAX_HERO_TRACKER_ENTRANCE_SECONDS`** (`apps/api/src/timers/timer-limits.ts`): 30 minutes, because an entrance stays open for 20 and the margin covers clock skew.

### User feed

- **`kill_groups`** (`apps/api/src/users/user-feed.ts`): groups Organization kill fan-out by a hash of the complete `occurredAt` multiset, because kill creation assigns `occurredAt` once before fan-out and distinct kills in one minute must stay apart.
- **`linked_loots`** (`apps/api/src/users/user-feed.ts`): joins each loot to the closest kill of its NPC within the Web feed's live window, expanding each loot to the kill minutes its window covers so the join stays an equality join.

## Consequences

- Every writer of loot, kill or ranking rows must follow the documented key and lock orders; a new writer that locks in a different order can deadlock production traffic.
- Denormalized record columns, mask bits and the `npcVisibility` encoding are persisted contracts: data migrations rewrite them, and values are never renumbered.
- Index and query shapes were chosen from measured plans; changing them needs a new measurement on production-sized data.
- The Game client must stay conservative: it may skip work only when the API would reject it, so new acceptance rules treat missing input as unknown.
- Redis dedup is an optimization over database constraints, never the only guard against duplicates.
