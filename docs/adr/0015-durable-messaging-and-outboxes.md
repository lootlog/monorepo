# 0015. Durable messaging and outboxes

Status: accepted

## Context

Accepted records must reach RabbitMQ consumers, caches, search indexes and the
gateway at least once, even when the broker is down or a process dies between
commit and publication. Services and clients are deployed independently, so
consumers receive payloads from older releases, redeliveries and messages out
of order. RabbitMQ keeps only payloads, cannot change a live queue's
arguments, and drops unroutable messages silently.

The API therefore writes durable side effects to outbox tables in the same
transaction as the change and drains them later. Consumers choose retry and
dead-letter policies so a retry cannot reorder state or repeat a side effect.
Work that only improves freshness stays best effort. This builds on
[ADR 0004](0004-fail-fast-messaging-and-idempotent-consumers.md).

## Decisions

### Transactional outboxes

- **`makeOutboxWorker`** (`apps/api/src/shared/outbox-worker.ts`): signals are hints in a dropping queue; the database stays the durable source of work, with a one-second fallback poll, so a lost signal delays a publication but never drops it.
- **`makeOutboxDispatcher`** (`apps/api/src/shared/outbox-worker.ts`): delivers one locked row per transaction, deletes a row only after delivery succeeds, and stamps `lastAttemptAt` on failure so older work is tried first. Delivery is at least once.
- **`makeLootPublicationDispatcher`** (`apps/api/src/loots/submission/loot-publication-outbox.ts`): locks one outbox intent per transaction and leaves failed deliveries in the table for the next poll, so an accepted loot's publication is never lost. It holds one transaction per delivery for simplicity; leased batches are worth adding only if measured throughput requires them.
- **`makeLootSnapshotReader`** (`apps/api/src/loots/submission/loot-publication-outbox.ts`): encodes the `loot.created` payload through the same Organization-scoped query as HTTP responses, so event consumers and HTTP readers see identical loot shapes.
- **`createDraw`** (`apps/api/src/loots/loot.repository.ts`): inserts the draw announcement outbox row in the draw's transaction, so the announcement survives a broker outage or a restart before publication.
- **`makeLootDrawAnnouncementDispatcher`** (`apps/api/src/loots/loot-draw-announcement-outbox.ts`): reads the draw when sending, so a draw voided meanwhile still announces its first outcome as drawn. A replayed row reuses the same message id, and a row whose loot or draw is gone is dropped.
- **`makeEventHeroCheckDispatcher`** (`apps/api/src/events/kills/event-hero-check-outbox.ts`): may enqueue a row more than once, because the deterministic BullMQ job id and the kill processor's window dedup make a repeat a no-op.
- **`reconcile`** (`apps/api/src/guilds/guild-discord-sync.data-layer.ts`): deletes removed Discord channels and writes their `discord.guild.channel.deleted` facts to the outbox in one transaction, so a failed publish cannot lose a deletion that a later refresh would no longer see.

### Member change delivery

- **`queueMemberDeliveries`** (`apps/api/src/members/member.repository.ts`): queues the `MemberSyncDelivery` row in the committing transaction and bumps `version` when a change arrives while an older one is in flight, so the in-flight delivery cannot delete the newer change. It sorts member ids before upserting so concurrent writers lock rows in one order and cannot deadlock.
- **`makeMemberDelivery`** (`apps/api/src/members/member-delivery.operations.ts`): writers queue a row in their transaction and call `deliver` after commit; the dispatcher retries whatever that attempt left. `notify` invalidates caches before publishing, because a published event makes consumers re-read permissions immediately.
- **`deactivateMissing`** (`apps/api/src/members/member-removal.operations.ts`) and member removal in `apps/api/src/members/member-commands.data-layer.ts`: a removal commits its delivery row with the deactivation, because a retry sees the member as already inactive and only the committed row keeps the removal deliverable.
- **`claimDelivery`** (`apps/api/src/members/member.repository.ts`): leases a pending delivery in one autocommitted statement, so no transaction or row lock is held while the caller talks to Redis and RabbitMQ. `DELIVERY_LEASE` (30 s) is longer than the delivery timeout, so an expired lease reliably means the claimant died.
- **`completeDelivery`** (`apps/api/src/members/member.repository.ts`): deletes only the delivered version and releases the claim when a newer change was queued during delivery, which then gets its own delivery.

### Consumer failure policy

- **`ConsumerRoute`** (`packages/protocol/src/rabbit/topology.ts`): `prefetch` defaults to 1 because handling one delivery at a time keeps queue order. `rejectToRetryQueue: false` marks queues declared before rejections went to the retry queue, because RabbitMQ cannot change a live queue's arguments.
- **`failureDestinations`** (`packages/protocol/test/rabbit-topology.test.ts`): topology tests check that every failure destination is bound, because RabbitMQ silently drops a message published to an unbound routing key.
- **`UnprocessableDelivery`** (`packages/messaging/src/messaging.ts`): marks deliveries that can never succeed; retry and dead-letter policies send them straight to the dead-letter queue, and nack policies reject them without requeue.
- **`routeFailure`** (`packages/messaging/src/messaging.ts`): logs the handler's cause before settling the delivery, because the broker keeps only the payload.
- **`orderedHandlerRetry`** (`apps/api/src/runtime/background/rabbit-consumer.ts`): retries a failed handler in place (250 ms, 500 ms, 1 s) before settling, so later messages stay behind it and order is preserved. The backoff runs outside the handler slot so a retrying queue does not block other queues.
- **`handlerSlots`** (`apps/api/src/runtime/background/rabbit-consumer.ts`): all API consumers share one five-slot semaphore so database connections stay available to HTTP requests.
- **`apiRabbitRoutes`** (`apps/api/src/runtime/infrastructure/api-rabbit.ts`): facts that describe latest state without a sequence (`characterOffline`, Discord channel and sync facts, timer notification facts) retry in place and then dead-letter, because a delayed retry could apply an older fact over a newer one. `margonemAccountVerified` dead-letters too, since the next join announces the account again. `heroSightingUpdated` and `lootDrawResolved` may be redelivered later because their instant jobs are keyed by transition or by draw and outcome.
- **`recordMargonemAccountVerification`** (`apps/api/src/users/margonem-accounts.ts`): never moves the verification time back, so late or repeated gateway facts are harmless.
- **Activity consumer routes** (`apps/activity/src/activities/activity-consumer.ts`): register no log-only `.dlq` handlers, because a handler that succeeds is acked and would delete every dead-lettered event instead of keeping it for recovery.
- **`rejectEvent`** (`apps/activity/src/online/online-consumer.ts`): acks an invalid signed online event only after its dead-letter publication is confirmed, so the evidence is never discarded.

### Best-effort side effects

- **`ignorePublicationFailure`** (`apps/api/src/shared/best-effort-publication.ts`): settles best-effort realtime publications without failing the committed request, but logs a warning, because some readers (such as a volunteer notice) never refetch and a broker outage must stay visible.
- **Reservation realtime hints** (`apps/api/src/reservations/reservation-mutation-ports.ts`): a failed hint is logged rather than failing the saved mutation; a missed hint only leaves views stale until their next read.
- **`makeCharacterAurasCache`** (`apps/api/src/runtime/features/character-auras.ts`): a failed `invalidate` is logged, because the write is committed and readers catch up when stored copies expire.
- **`recordNpcSpawnPositions`** (`apps/api/src/npc-spawns/npc-spawn-positions.ts`): only feeds the wiki, so its failure never fails the loot or timer submission it came with.

### Event contract compatibility

- **`GuildLootCreatedMessageV2`** (`packages/protocol/src/loot-events.ts`): `loot` is optional because publishers before the snapshot omit it; Web clients then read the loot over HTTP. Loot and reservation events live in this module, apart from the RabbitMQ catalogue, so the browser-bound realtime protocol does not bundle server-only schemas.
- **`LootSnapshot`** and **`MapPlayersSnapshot`** (`packages/protocol/src/loot-summary.ts`): `likes`, `standingDraws` and player `lvl` are optional because earlier publishers and add-ons omit them; a player without a level cannot enter a draw.
- **`CatalogNpcObservation`** and **`CatalogMonsterLocation`** (`packages/protocol/src/rabbit/catalog.ts`): `lootId` orders NPC observations so the catalog resolves late or reordered ones; `tiles` is optional because API revisions before spawn tiles omit it.
- **`MargonemAccountVerifiedV1`** and **`GuildBanner`** (`packages/protocol/src/rabbit/events.ts`): verification facts may arrive late or twice, so consumers order them by `verifiedAt`. A missing banner from an older bot keeps the stored banner instead of clearing it.
- **`decodeRabbitEvent`** (`packages/protocol/src/rabbit/events.ts`): returns the validated input rather than the decoded value, to preserve wire extension fields and object identity.
- **`readActivityEventSignature`** (`packages/protocol/src/rabbit/activity-signature.ts`): accepts a list-valued header because AMQP may relay a header as a list.
- **`LegacyReservationChanged`** (`packages/protocol/src/realtime/organization-events.ts`): `reservation.created` and `reservation.deleted` are still sent beside `reservation.changed` for clients that predate it.
- **`NotificationGoingUpdate`** (`packages/schema/src/notification-going.ts`), Discord notification `files` (`packages/schema/src/notifications.ts`) and **`NpcPresenceReportSchema`** (`packages/schema/src/npc-presence.ts`): `npcId`, `files` and `map` are optional so payloads stored or sent before those fields stay valid; a bot without `files` support posts the message alone.

### Search projections

- **`consumeInBatches`** (`packages/meilisearch/src/batch-consumer.ts`): groups up to 50 deliveries or 3 s per batch so Meilisearch runs a few large tasks. Deliveries stay unacknowledged until their batch applies, failed batches retry in order every 5 s, and undecodable deliveries are rejected to the dead-letter exchange. A permanently failing batch is reapplied one delivery at a time, which is safe because applying is an upsert. Each batch runs in its own root span because the loop outlives the consume span.
- **`isPermanentSearchFailure`** (`packages/meilisearch/src/operation-failure.ts`): treats only Meilisearch rejections of the request itself as permanent; transport, timeout, internal and auth failures stay retryable.
- **`changedDocuments`** (`packages/meilisearch/src/projection.ts`): merges incoming documents over stored ones and compares them as JSON, so a redelivered observation writes nothing.
- **`configureMeilisearchIndexes`** (`packages/meilisearch/src/index-settings.ts`): compares searchable attributes in order, because order affects ranking, and filterable and sortable attributes as sets.
- **`runSearchOperation`** (`packages/meilisearch/src/search-unavailable.ts`): answers a search engine failure with a 503 `SearchUnavailable` rather than an empty success, so clients show degraded state.

### Catalog projection

- **`CatalogChange`** and `write` (`apps/catalog/src/database/catalog-store.ts`): a change first runs on a snapshot where saves only report whether anything would change, so redundant deliveries finish without waiting. Changes that save rerun under a writer lock shared by every consumer and replica and replace the Meilisearch entries before commit, so the index follows commit order and a failed projection rolls the change back. A commit that fails after projection leaves the index ahead until the next change or rebuild.
- **`catalogQueues`** (`apps/catalog/src/catalog-application.ts`): replays use separate queues so live loots never wait behind a backfill.
- **`CatalogWrite`** (`apps/catalog/src/items/items.service.ts`): a callback may run twice (snapshot pass, then locked pass), so it derives everything from what it reads, and `countEntries` (`apps/catalog/src/shared/entry-metrics.ts`) counts delivery metrics only once written.
- **`getIndex`** (`apps/catalog/src/catalog/catalog.service.ts`) and `CatalogReads`: whole-catalog listings and lookups by key read PostgreSQL, because a Meilisearch search stops at `maxTotalHits` (1000).
- **`saveNpcLoots`** (`apps/catalog/src/database/catalog-store.ts`): stores loot-ordering updates without projecting, because no search reads the loot id.
- **Observation merges** (`mergeItemDropFields`, `mergeItemLevels`, `mergeNpcDocument`, `earliestSeenAt` in `apps/catalog/src/items/`, `apps/catalog/src/npcs/npcs.service.ts` and `apps/catalog/src/shared/first-seen.ts`): are commutative and keep the earliest first sighting, because delivery order is not chronology.
- **`setMonsterDrops`** and **`setLocations`** (`apps/catalog/src/items/items.service.ts`, `apps/catalog/src/npcs/npcs.service.ts`): scheduled API updates write only their own fields, so observations indexed meanwhile are kept; a concurrent drop may restore a retirement until the next run but never loses a source.
- **`toNpcIndexDocuments`** and **`toItemIndexDocuments`** (`apps/catalog/src/projection/catalog-indexes.ts`): derived search fields are computed at projection time and never stored, so stored entries need no rewrite when a derivation changes.
- **`rebuild-projection`** (`apps/catalog/src/scripts/rebuild-projection.ts`): builds each index in a `<name>_rebuild` shadow and swaps all shadows in one atomic task, so searches never see a half-built index; consumers keep writing during the run, so it belongs at a quiet hour. `BATCH_PAYLOAD_LIMIT_BYTES` caps batches at 8 MB because Meilisearch rejects bodies over 12.5 MB, and `fill` reads every monster's first sighting before paging because pages cut a monster's identities apart.

### Member refresh jobs

- **`isRetryableMemberRefreshStatus`** (`apps/api/src/members/member-discord-sync-status.ts`) and the scheduler in `apps/api/src/members/member-refresh-scheduler.ts`: a Discord refusal is not retried or rescheduled, because Discord answers the same until the member or server changes. `isTransientMemberSyncStatus` still serves stored access until a refresh settles the member.
- **`isDiscordRefusalSyncStatus`** (`apps/api/src/members/member-discord-sync-status.ts`): treats Discord 4xx as a refusal attributable to the member, except 408, which is Lootlog's own timeout. `decodeDiscordHttpError` relies on `toDiscordRequestError` keeping unmapped statuses as `DISCORD_HTTP_ERROR` with the status in `details`.
- **`makeMemberRefreshProcessor`** (`apps/api/src/members/member-refresh.processor.ts`): when another job of the same user holds the lock, the job is delayed by `LOCKED_RETRY_DELAY_MS` (one second, the usual refresh time) and rejected with BullMQ `DelayedError`, the only error that keeps a delayed job; this keeps its priority and attempts. It records no failure metric for `MemberRefreshRetryable`, which already recorded its outcome.
- **Bulk refresh** (`apps/api/src/members/member-bulk-refresh.processor.ts`, `apps/api/src/members/member-commands.data-layer.ts`): each attempt resets processed counts because a retry starts over, and creation locks the `Guild` row `for no key update` so only one request passes the cooldown check.
- **Member sync** (`apps/api/src/members/member-sync.operations.ts`): a member who must sign in again repeats the refresh on every request, because only the auth service learns of a new sign-in, so the warning is logged only when the status changes.

### Observability and resilience details

- [Observability and resilience](0015-durable-messaging-and-outboxes/observability.md#observability-and-resilience)
