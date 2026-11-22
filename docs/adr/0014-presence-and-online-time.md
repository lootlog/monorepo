# 0014. Presence, sightings and online time

Status: accepted

## Context

Lootlog derives live state from what Game clients see: which characters are
online in an Organization, which timer NPCs stand on a map, which clan
enemies are nearby, and where a roaming hero was last detected. Gateway
replicas hold this state in Dragonfly and announce it as revisioned changes;
the activity service folds online checkpoints into durable history.

Replicas can be interrupted mid-command, Dragonfly scripts may touch only
declared keys of one slot, frames from several replicas arrive out of order
and with skewed clocks, and RabbitMQ redelivers. Accepted observations and
departures must not be lost, revisions must not go backwards, and a sighting
must not reveal more than the Organization's policy allows.

## Decisions

### Organization presence durability

- **`refresh`** (`apps/gateway/src/realtime/presence-store.ts`): presence writes queue their delta when the Redis command settles, not when the caller completes, because commands can settle after the caller is interrupted. Metadata `lastSeen` outlives the payload TTL so expiry still knows the departure, and a refresh restores the Organization and due indexes.
- **`REFRESH_PRESENCE`** (`apps/gateway/src/realtime/presence-store.ts`): each script call touches the keys of one Organization only.
- **`presence-store.ts`** (`apps/gateway/src/realtime/presence-store.ts`): the delta loop flushes once more on shutdown, bounded to 1 s, because queued removals exist nowhere else.
- **`flush`** and **`requeue`** (`apps/gateway/src/realtime/presence-deltas.ts`): failed, interrupted and never-started batches are requeued in `Effect.ensuring`, and a requeue never overwrites changes queued after the failed flush.
- **`REMOVE_EXPIRED_PRESENCE`** and **`removeExpired`** (`apps/gateway/src/realtime/presence-expiry.ts`): an expiry removal schedules the departure in the same script, comparing captured values, and is announced once Redis stored it even if the sweep was interrupted.
- **`CLAIM_OFFLINE`** (`apps/gateway/src/realtime/presence-offline.ts`): departure claims make one atomic decision per Organization from one fresh read, with no per-character waits and no observations retained across another group's round trip; a reconnect before the claim suppresses the departure, one after it starts a new online period.
- **`DROP_OFFLINE`** (`apps/gateway/src/realtime/presence-offline.ts`): cleanup compares captured values, which are read with MGET before Organization reads because Dragonfly scripts may access only declared keys, so a replacement departure written meanwhile survives.
- **`RENEW_OFFLINE_LEASE`** (`apps/gateway/src/realtime/presence-offline.ts`): the lease is checked once after capturing outbox values and renewed with each acknowledgement; acquisition stays interruptible during failover, and an orphaned lease expires.
- **`SNAPSHOT_MAX_AGE_MS`** and **`read`** (`apps/gateway/src/realtime/presence-snapshots.ts`): the snapshot reads the revision before the rows, so anything missing arrives later as a delta; cached snapshots serve viewers only, while their revision is current and for at most 1 s, and offline decisions do their own fresh read.

### Online time

- **`OBSERVE`** (`apps/gateway/src/realtime/online-history.ts`): every confirmed observation is persisted in Redis before cumulative segments are published, and a collector reports its own Redis outage so another gateway's health cannot hide it.
- **`UserOnlineCheckpointV1`** and **`UserOnlineHealthV1`** (`packages/protocol/src/rabbit/events.ts`): checkpoints carry cumulative confirmed presence, where a gap starts a new segment and retries never extend one; health is published only after pending checkpoints drained.
- **`onlineRoute`** (`apps/activity/src/online/online-consumer.ts`): uses broker retry with a single active consumer so checkpoints stay ordered; `repository.ingest` retries transient failures in place every 5 s, and an `OnlineIngestRejected` checkpoint is dead-lettered instead of blocking the queue.
- **`ingest`** (`apps/activity/src/online/online-repository.ts`): drops redeliveries that ended before the retention cutoff, clamps starts to it, and updates the day rollup in the interval's transaction with the segment's stored world.
- **`userOnlineDays`** (`apps/activity/src/database/schema.ts`): a rebuildable read model of merged spans per user, Warsaw day and world; rows grow only by set union, so redelivery and reordering are idempotent, and spans are clipped by readers.
- **`upsertOnlineDays`** and **`rebuildOnlineDays`** (`apps/activity/src/online/online-days.ts`): intervals split at Warsaw midnight and merge by union; a world-less replay that makes a known segment unknown recomputes the touched days, because a union cannot take time back. Both use tagged SQL because Drizzle has no multirange operators or lateral `generate_series`.
- **`find`** (`apps/activity/src/online/online-repository.ts`): aggregates day rows and clips spans to the retention cutoff at read time.
- **`online-repository.ts`** (`apps/activity/src/online/online-repository.ts`): retention runs in transactions of at most 1000 rows per phase against a fixed, resumable cutoff, and deletes by `ctid` under row locks.

### Activity storage

- **`parseActivityCursor`** and **`CURSOR_TIMESTAMP_FORMAT`** (`apps/activity/src/activities/activity-cursor.ts`, `apps/activity/src/activities/activity-repository.ts`): cursors carry `createdAt` as PostgreSQL text with microseconds read through `to_char`, because a millisecond Date would skip rows sharing a millisecond; year 0000 is rejected.
- **`idempotencyLowerBound`** (`apps/activity/src/activities/activity-repository.ts`): bounds the duplicate lookup to the key's timestamp suffix minus `IDEMPOTENCY_CLOCK_SKEW_MS` (one day), because compressed chunks have no index on the key.
- **`findExisting`** (`apps/activity/src/activities/activity-repository.ts`): runs as a new statement after `INSERT ... ON CONFLICT DO NOTHING`, because a concurrent insert may be invisible to the insert's snapshot.
- **`activity-repository.ts`** (`apps/activity/src/activities/activity-repository.ts`): deletes filter by `guildId` and `id` in one statement, so `createdAt` never passes through a Date and only one compressed segment decompresses.
- **`schema.ts`** (`apps/activity/src/database/schema.ts`): the member session table has no secondary index, and `userOnlineIntervals` and `userOnlineTracking` keep advancing checkpoint fields out of B-tree indexes so updates stay HOT.
- **`activity-http.ts`** (`apps/activity/src/http/activity-http.ts`): the health probe is a tagged `SELECT 1`, because Drizzle's builder requires a table.

### NPC presence

- **`APPLY_SCRIPT`** (`apps/gateway/src/realtime/npc-presence-service.ts`): stores one `<npcId>|<connectionId>` field per reporter and replaces a connection's fields wholesale, so a field left by a failed write is dropped.
- **`report`** (`apps/gateway/src/realtime/npc-presence-service.ts`): reports are serialized per socket through `locks`, and after a failed write the socket's state is cleared and the next report is resent whole.
- **`REVISION_TTL_MS`** (`apps/gateway/src/realtime/npc-presence-service.ts`): revisions live 7 days, longer than reports, so recipients never see one go backwards.
- **`NpcPresenceReporter`** (`apps/game-client/src/features/npc-presence/npc-presence-reporter.ts`): `configure` clears `sentKey` on a new connection or character, because the gateway forgets reports then, and a map name over `NPC_PRESENCE_MAP_MAX_LENGTH` is omitted so the report is not rejected.
- **`useTimerNpcPresence`** (`apps/game-client/src/features/timers/hooks/use-timer-npc-presence.ts`): ignores a sighting older than the timer's last change, because it predates the kill.

### Organization presence on the Web

- **`OrganizationPresence`** (`apps/web/src/lib/organization-presence.ts`): replays every live update seen during a snapshot fetch, including equal revisions, because the gateway reads rows and revision separately.
- **`OrganizationPresence`** (`apps/web/src/lib/organization-presence.ts`): drops to `unavailable` on any access restriction before refetching, because a restriction can hide locations without denying the list, and defers unsubscribing to a microtask so React can replace subscribers in one commit.

### AirTag visibility

- **`isAirTagClanEnemy`** (`packages/schema/src/air-tag.ts`): AirTags carry clan enemies only; personal enemies are private, and neutral players, friends and clan mates are never shown.
- **`isInHeroSight`** and **`isSeenByHero`** (`apps/game-client/src/features/air-tags/air-tag-game-visibility.ts`): Margonem sends every player inside the hero's war shadow range, so a report inside that range of a player the game does not draw is stale, and AirTags never cover characters the game draws.
- **`showsAirTagsOnMap`** (`apps/game-client/src/features/air-tags/air-tag-game-visibility.ts`): shows AirTags only on red (`pvp === 2`) maps, while members keep reporting everywhere so timers count enemies.
- **`air-tag-observation-controller.ts`** (`apps/game-client/src/features/air-tags/air-tag-observation-controller.ts`): `getDepartureReason` reports `left` only well inside war shadow range, because Margonem sends `del` for leaving range too, and `applyAttributes` clears stasis on movement because Margonem never sends `stasis: 0`.
- **`readUnseenAirTagEnemies`** (`apps/game-client/src/features/air-tags/air-tag-unseen-enemies.ts`): filters out online members of a joined Organization, who may be clan enemies from another Margonem clan, and loads presence sources only once enemies are reported.

### AirTag reporting protocol

- **`AIR_TAG_HEARTBEAT_INTERVAL_MS`**, **`AIR_TAG_HEARTBEAT_SCAN_INTERVAL_MS`** and **`AIR_TAG_BATCH_INTERVAL_MS`** (`apps/game-client/src/features/air-tags/air-tag-observation-controller.ts`): tuned as one budget that keeps a still target's sightings under 6.5 s apart, inside the 10 s freshness windows; batches are 1 s because movement already queues after `AIR_TAG_MOVEMENT_THRESHOLD_TILES` and every batch costs the same.
- **`AIR_TAG_REPORTER_LEASE_MS`** and **`AIR_TAG_STANDBY_TAKEOVER_MS`** (`packages/schema/src/air-tag.ts`): one observer reports each target; the 6 s lease outlasts a heartbeat gap and the 7 s takeover lands before the target expires.
- **`takeOver`** (`apps/game-client/src/features/air-tags/air-tag-observation-controller.ts`): every standby that still sees an orphaned target offers to take over and the gateway keeps the first; standbys stay silent while sightings arrive.
- **`LocalAirTagTarget`** (`apps/game-client/src/features/air-tags/air-tag-observation-controller.ts`): the controller tracks every player the game sent, because anyone can become an enemy; only clan enemies are published.
- **Departures** (`apps/game-client/src/features/air-tags/air-tag-observation-controller.ts`): a re-created target stays `sent` while its departure is queued, `withdraw` sends `out-of-sight` for a former enemy, `retry` re-queues a rate-limited departure unless the player is an enemy again, and evicting a `sent` target beyond `MAX_LOCAL_TARGETS_PER_SCOPE` queues `out-of-sight`, so the gateway never keeps a stale observer.
- **`toObservation`** (`apps/game-client/src/features/air-tags/air-tag-observation-controller.ts`): malformed targets are dropped before queueing, because one would reject the whole batch.
- **`AirTagObservationPayload.departures`** (`packages/schema/src/air-tag.ts`): are sent only to gateways that list `lootlog.air-tag-scope-update.v1`.
- **`AirTagScopeUpdateEvent`** (`packages/schema/src/air-tag.ts`): removals precede updates and `targets[i]` carries revision `revision - (targets.length - 1 - i)`.
- **`AirTagScopeState.revisions`** (`apps/game-client/src/features/air-tags/air-tag-receive-controller.ts`): tracks a revision per target plus `baseRevision`, so a late frame cannot restore a removed target or an older position.
- **`toLocalTarget`** and **`receive`** (`apps/game-client/src/features/air-tags/air-tag-receive-controller.ts`): gateway timestamps shift onto the local clock by the server offset, and incremental updates are re-stamped at receive time.
- **`isReportedByOthers`** (`apps/game-client/src/features/air-tags/air-tag-receive-controller.ts`): treats every received target as another observer's, because the gateway leaves a connection's own sightings out.
- **`DEPARTED_HIDE_MS`** (`apps/game-client/src/features/air-tags/air-tag-receive-controller.ts`): 3 s, longer than the gateway takes to remove a player everyone saw leave.
- **`air-tag-runtime.ts`** (`apps/game-client/src/features/air-tags/air-tag-runtime.ts`): `handlePresencePublished` skips the role-change debounce only when this character's publication opened a pending Lootlog, and a failed `air-tag.subscription` ack is ignored because the next change resends the full subscription.

### AirTag publication in the gateway

- **`publishObservations`** (`apps/gateway/src/realtime/air-tag-service.ts`): counts rate limits before any work, filters to clan enemies before any Redis call because older clients report every player, and merges scopes sequentially with per-scope isolation.
- **`AirTags`** (`apps/gateway/src/realtime/air-tag-service.ts`): a rate-limited batch is acknowledged `rejected` with `retryAfterMs`, and the client merges it into its next batch.
- **`admitConnectionBatch`** and **`UserBatchLimiter`** (`apps/gateway/src/realtime/air-tag-store.ts`): per-connection and per-user limits live in replica memory, so a flood never reaches Dragonfly; a user on several replicas gets the limit on each.
- **`threatsAllowed`** and **`publishThreat`** (`apps/gateway/src/realtime/air-tag-service.ts`): only proof-verified characters raise map threats, which go to game sessions of any world but only the Organization's precise-presence audience, because a sighting reveals the observer's map.
- **`THREAT_REFRESH_MS`** (`apps/gateway/src/realtime/air-tag-store.ts`): sightings are re-reported after 4 s to keep their age under `AIR_TAG_MAP_THREAT_FRESH_MS`, and `AirTagMapThreatEnemy.ageMs` is computed at send time to avoid client skew.
- **`INTEREST_REFRESH_MS`** and **`INTEREST_TTL_MS`** (`apps/gateway/src/realtime/air-tag-service.ts`, `apps/gateway/src/realtime/air-tag-store.ts`): replicas re-register interest every 30 s for 90 s, grouped per Organization (`refreshInterest`), and `REGISTER_INTEREST_SCRIPT` expires it on Redis `TIME`.
- **`organizationTag`** (`apps/gateway/src/realtime/air-tag-store.ts`): every key of one Organization shares the `{air-tag:<id>}` hash tag, so scripts stay on one slot.
- **`subscriptionLocks`** (`apps/gateway/src/realtime/air-tag-service.ts`): subscription changes are serialized per socket in send order.
- **`DisabledScopes`** (`apps/gateway/src/realtime/air-tag-store.ts`): the kill switch is set by hand in Dragonfly per Organization and world and cached for `DISABLED_FLAG_TTL_MS`, so it takes up to 30 s to act.

### Hero sightings

- **`parseHeroDetectorMessage`** and **`HERO_DETECTOR_MESSAGE`** (`packages/domain/src/hero-sightings.ts`): read hero and map by name from the Polish or English answer because Margonem sends no ids, and the name pattern `[^[\]]+?` cannot backtrack across `[/b]` on crafted input.
- **`getHeroSightingKey`** (`packages/domain/src/hero-sightings.ts`): keys sightings by normalized hero name, because a world has one hero per name.
- **`resolveHeroSightingTransition`** (`packages/domain/src/hero-sightings.ts`): orders detections by Margonem's answer time, not arrival, and deliberately does not infer a kill and respawn between two spawn detections on one map.
- **`upsertNewestHeroSighting`** (`packages/domain/src/hero-sightings.ts`): keeps the highest id per hero and Organization world, because ids grow with time.
- **`HERO_SIGHTING_STALE_AFTER_MS`** (`packages/domain/src/hero-sightings.ts`): a roaming sighting older than 30 min stays open but shows as unconfirmed, because the hero may be dead.
- **`isHeroSightingClaimable`** (`packages/domain/src/hero-sightings.ts`): camping claims are allowed only on open SPAWNING sightings, and earlier claims survive the change to roaming.
- **`hero-sighting-rows.ts`** (`apps/game-client/src/features/hero-sightings/hero-sighting-rows.ts`): `isHeroSightingDetectorClaim` compares member ids only within one Organization, `getMemberKey` deduplicates by `userId` with a `guildId:memberId` fallback, and `compareInstants` parses timestamps because their precision varies.
- **`getTimerMapName`** (`apps/game-client/src/features/timers/components/timer-map-presence-provider.tsx`): places HERO and EVENT_HERO timers (`DETECTABLE_HERO_TYPES`) on the current sighting's map, not the kill location, and stale roaming sightings no longer place them.
- **`HeroSightings`** (`apps/game-client/src/features/hero-sightings/hero-sightings.tsx`): loads sightings for the timers' world even while its window is closed.
- **`useAddHeroSightingForm`** (`apps/game-client/src/features/hero-sightings/hooks/use-add-hero-sighting-form.ts`): profession and state come only from a suggestion or pasted answer and are sent only while the name matches (`knownHeroRef`); otherwise a manual hero is sent as spawning.

## Consequences

- Every Dragonfly script works on one Organization's keys and compares captured values, so new presence features follow the same single-slot, compare-and-set shape.
- Interruptions are expected: anything Redis accepted must still be announced, which makes shutdown and retry paths part of the correctness contract.
- AirTag intervals, leases and freshness windows form one budget across client, schema and gateway; changing one requires rechecking the others.
- Online history is a rebuildable union; a new ingestion path must stay idempotent under redelivery and reordering.
- Sighting and threat delivery reveal member locations, so audiences stay limited to precise-presence viewers.
