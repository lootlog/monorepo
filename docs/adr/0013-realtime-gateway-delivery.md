# 0013. Realtime delivery through the v1 gateway

Status: accepted

## Context

The realtime v1 WebSocket protocol connects the gateway with the Web app, the
Game client and API key sessions. Old and new clients and gateway replicas
coexist during rollouts, and a client disconnects on any frame it cannot
decode. Replicas federate frames over Dragonfly Pub/Sub, which has no replay
and can reorder delivery, and consume RabbitMQ events that are refresh hints
over committed state.

The gateway must apply the same Organization policy as HTTP, revoke access
promptly and fail closed, survive reconnect storms and deploys, and stay cheap
on paths that run for every connected Game client.

## Decisions

### Protocol and compatibility

- **`features`** (`packages/protocol/src/realtime/protocol.ts`): `session.join` lists the events a client understands beyond the original set, and the gateway sends newer events only to clients that list them; old gateways ignore the field. `kill-stats.changed` and aura changes follow this rule (`apps/gateway/src/realtime/source-event-visibility.ts`, `apps/gateway/src/realtime/subscription-policy.ts`).
- **`getPingScopes`** (`apps/gateway/src/realtime/ping-routing.ts`): loot split choices reuse ping scopes, because a new topic would appear in `session.joined` for older clients that cannot decode it.
- **`CharacterAurasChangedSchema`** (`packages/schema/src/character-aura.ts`): aura ids are plain strings, so a client skips an unknown aura instead of rejecting the frame.
- **`PresenceSnapshot`** (`packages/protocol/src/realtime/protocol.ts`): presence unions list `PresenceWithLocation` before `BasicPresence`, so decoding does not strip location.
- **`RealtimeLogicalTopic`** (`packages/protocol/src/realtime/protocol.ts`): world global chat has its own `global.chat.world` topic, because a scope without a world matches every world.
- **`OrganizationEventPayloads`** (`packages/protocol/src/realtime/protocol.ts`, `packages/protocol/src/realtime/organization-events.ts`): the gateway forwards Organization payloads as `Schema.Unknown` without reading them; receivers trust them as the API's own, and payloads also served over HTTP mirror that response.
- **`PingCommand`** (`packages/protocol/src/realtime/protocol.ts`): `connection.ping` is answered without I/O, so its round trip measures only the connection.
- **`getScopeKey`** (`apps/gateway/src/realtime/realtime-audiences.ts`): the scope key format travels in federated messages, so it stays stable across releases.
- **`NpcPresenceEventSchema.revision`** (`packages/schema/src/npc-presence.ts`): orders updates of one Organization and world across replicas.
- **`PING_PRESENTATION`** (`apps/game-client/src/features/pings/ping-presentation.ts`): the `avoid` ping is labelled "Idę" but keeps `avoid` on the wire, because the contract is deployed.
- **`useMapPings`** (`apps/game-client/src/features/pings/use-map-pings.tsx`): a character ping carries its tile plus `npcId` or `playerId`, so older clients show a tile ping, and absent ids are omitted because the schema rejects explicit `undefined`; `usePings` sends attacks and player marks as `enemy` pings naming the character rather than a new type.
- **`canPingWarrior`** (`apps/game-client/src/features/pings/use-battle-pings.tsx`): restricts which ping types may mark which warrior, on both sender and receiver, because the gateway cannot see battle roles.

### Codec cost

- **`parseRealtimeJson`** (`packages/protocol/src/realtime/codec.ts`): uses the `__proto__`-rejecting reviver only when the text contains `__proto__` or a `\u` escape, because the reviver makes parsing several times slower.
- **`isJsonStable`** (`packages/protocol/src/realtime/codec.ts`): `prepareRealtimeFrame` reuses the validated value only when a JSON round trip provably leaves it unchanged; the decoder stays the authority on normalization.
- **`tryParseEncodedRealtimeFrame`** (`packages/protocol/src/realtime/codec.ts`): skips validation only for frames encoded through this schema; other input goes through `tryDecodeRealtimeFrame`.
- **`commandSuccessDecoders`** (`packages/protocol/src/realtime/codec.ts`): are built lazily, so a client pays only for commands it sends.
- **`FRAME_SCHEMA`** (`apps/gateway/src/realtime/realtime-hub.ts`): hashes the frame schema; frames from a replica with the same hash are forwarded without decode, others are validated to strip foreign fields.
- **`decodeFederatedRealtimeMessage`** (`apps/gateway/src/platform/redis-store.ts`): federated frames travel as nested JSON, so one parse covers envelope and frames, and frames are cast rather than re-walked by `Schema.Json`.

- **Presence snapshot budget** (`apps/gateway/src/realtime/presence-store.snapshots.test.ts`): the snapshot a client receives on a map or world join is held to the byte budget recorded in ADR 0011, because the game client decodes it on Margonem's thread and it grows with members online.

### Access policy and visibility

- **`createAccessPolicySnapshot`** and **`mergeRanges`** (`packages/protocol/src/realtime/access-policy.ts`): the snapshot versions canonical effective grants, so role ids, order and overlaps cause no spurious change; level ranges merge only when they overlap, because NPC levels can be fractional.
- **`diffAccessPolicies`** (`packages/protocol/src/realtime/access-policy.ts`): clients diff their local snapshot, also after reconnect, instead of applying an event's delta, which may refer to a newer baseline.
- **`joinSession`** (`apps/gateway/src/realtime/session-join.ts`): a join without Organization access still sends an empty `permissions.updated`, because a new connection has no baseline while the client may hold cached data.
- **`publishesPresenceTo`** (`apps/gateway/src/realtime/subscription-policy.ts`) and **`publishPresence`** (`apps/gateway/src/realtime/session-routes.ts`): a game session reads presence only where it publishes its own, so nobody watches an Organization incognito; a failed presence write opens none of the requested Organizations, and partial records expire.
- **`canSubscribe`** (`apps/gateway/src/realtime/subscription-policy.ts`): any Member may read shared global chat, while a world channel must name its world and is followed one world at a time.
- **`isPingEvent`** (`apps/gateway/src/realtime/realtime-delivery-policy.ts`) and **`prepareApiKeyEventVisibility`** (`apps/gateway/src/realtime/api-key-event-visibility.ts`): events without an Organization in their payload (pings, loot split choices, `loot-split.auto-accepted`) reach sockets only through authorized routing scopes, while API key visibility checks the payload's Organization even for direct user delivery.
- **`npc-event-visibility.ts`** (`apps/gateway/src/realtime/npc-event-visibility.ts`): an envelope for another Organization yields null, `canReadFeatureEvent` uses the shared `@lootlog/domain` rule behind REST `canReadChatNpcSource` and denies undecodable envelopes, and a ready-room removal (`isReadyRoomRemoval`) reaches former members too.
- **`canReadSourceEvent`** (`apps/gateway/src/realtime/source-event-visibility.ts`): kill aggregates bypass source visibility for ADMIN and OWNER; loot only for owners.
- **`npc-presence-service.ts`** (`apps/gateway/src/realtime/npc-presence-service.ts`): reporting NPC presence requires the timer write right and is closed to API keys (`reportableOrganizations`), and changes go to game sessions of any world because timers can show another world.
- **`loot-split-service.ts`** (`apps/gateway/src/realtime/loot-split-service.ts`): split frames are scoped by world, not map, because participants may leave the map.

### Permission caching and revocation

- **`CACHE_TTL`** (`apps/gateway/src/guilds/cache-keys.ts`): explicit invalidation revokes access; the soft `USER_GUILDS` TTL only bounds a lost grant event, and an uninvalidated projection may be served up to `MAX_STALE_CACHE_AGE` (15 min), matching the API's cache.
- **`cacheGuildsScript`** and **`CachedRevisionJson`** (`apps/gateway/src/guilds/guild-store.ts`): a projection is written only if the stored revision is unchanged, fencing out responses to requests started before an invalidation; the TypeScript check decodes only the revision to match the Lua fence.
- **`getUserGuilds`** (`apps/gateway/src/guilds/guild-store.ts`): `pendingFetches` single-flights fetches per user and revision; a `freshness: "required"` read always fetches, and a join with a young valid projection is served from cache while it refreshes in the background.
- **`AccessRebalancer`** (`apps/gateway/src/realtime/access-rebalance.ts`): revokes a confirmed removal before any I/O, `commitAccess` updates every local socket synchronously, unconfirmable permissions reconnect the affected sockets, and `PERMISSION_REBALANCE_DEADLINE` (30 s) bounds unconfirmed authority.
- **`federate`** (`apps/gateway/src/realtime/access-rebalance.ts`): cache and federation failures never block local revocation; failures are preserved so RabbitMQ redelivers.
- **`command-handler.ts`** (`apps/gateway/src/realtime/command-handler.ts`): commands on a closing session fail, because its authority may predate a lost revocation.
- **`realtime-hub.ts`** (`apps/gateway/src/realtime/realtime-hub.ts`): a socket over the subscription limit loses every subscription before closing, so reconciliation never keeps a revoked one.
- **`permissionIndexes`** (`apps/gateway/src/realtime/subscription-policy.ts`): lookups are cached in a WeakMap keyed by the grants array, which is safe only because sessions replace that array on every change.

### Federation continuity

- **`FederationSequence`** and **`publishSequencedScript`** (`apps/gateway/src/platform/federation-sequence.ts`, `apps/gateway/src/platform/redis-store.ts`): frames are numbered and published in one Lua script, so a hole is a lost frame once it outlasts the reorder window; a counter below the last seen value means a reset, and `resume` reports `lost`.
- **`RedisGatewayStore.subscribe`** (`apps/gateway/src/platform/redis-store.ts`): reads the counter after SUBSCRIBE, reports a `gap` only when frames were actually lost, reports interruptions immediately while still delivering the backlog, and yields every 64 frames or 4 ms.
- **`interruptFederation`** (`apps/gateway/src/realtime/realtime-hub.ts`): withdraws readiness at once, while existing sessions wait `FEDERATION_GRACE_MS` (15 s) for proof of continuity.
- **`closeAfterFederationGap`** (`apps/gateway/src/realtime/realtime-hub.ts`): closes every local session after a gap, marking them `closing` and detaching them first, because lost frames may include permission rebalances.
- **`publishToScope`** (`apps/gateway/src/realtime/realtime-hub.ts`): retries federation publish even after local delivery, because other replicas still need the frame.

### RabbitMQ delivery semantics

- **`makeEventEmitter`** (`apps/api/src/events/event-emitter.ts`): change events are refresh hints, so a failed publication is logged and never fails the caller; aura changes (`announce` in `apps/api/src/character-auras/character-auras.data-layer.ts`) and global chat (`apps/api/src/global-chat/global-chat.data-layer.ts`) publish after commit on the same terms.
- **`event-hero-kill-recording.ts`** (`apps/api/src/events/kills/event-hero-kill-recording.ts`): hero kill events on separate routing keys carry no ordering guarantee; only the read cache invalidation must precede them.
- **`makeGuildSightingWriter`** (`apps/api/src/hero-sightings/hero-sightings.data-layer.ts`): publishes the current sighting even when unchanged, so a retried request still reaches every client.
- **`gateway-queues.ts`** (`apps/gateway/src/rabbit/gateway-queues.ts`): notification-going and kill-stats queues nack without retry or DLQ because the next event heals them; member-access rebalances use `MEMBER_ACCESS_PREFETCH` 8 without ordering because they are idempotent; `deadLetterIdentifiers` logs identifiers only and decodes each field independently.
- **`bridge-routes.ts`** (`apps/gateway/src/rabbit/bridge-routes.ts`): an envelope mismatch fails as `UnprocessableDelivery` naming only the field, `npc` is omitted rather than `undefined`, and `CHARACTER_AURAS_CHANGED` carries full state so it needs no deduplication.

### Admission and hot-path cost

- **`JOIN_ADMISSION_LIMITS`** and **`AIR_TAG_OBSERVATION_ADMISSION_LIMITS`** (`apps/gateway/src/realtime/command-admission.ts`): joins get 250/s and 48 concurrent slots, leaving 16 of 64 for heartbeats; air-tag batches get 300/s and 8 slots, about half the measured failure point.
- **`CommandIngress`** (`apps/gateway/src/realtime/command-ingress.ts`): admits frames before decoding, yields before each frame, keeps connection capacity reserved until disconnect cleanup ends, and sizes `defaultLimits` so one reconnect can restore 4096 maximum-size subscriptions.
- **`command-handler.ts`** (`apps/gateway/src/realtime/command-handler.ts`): `rejectOverloaded` runs synchronously without fibers or I/O, malformed ping, loot split and air-tag payloads get a protocol rejection instead of a close, and a defect still sends an error response.
- **`CommandRoute.traced`** (`apps/gateway/src/realtime/command-routes.ts`): spans are opt-in, because one costs about as much as the command.
- **`session-routes.ts`** (`apps/gateway/src/realtime/session-routes.ts`): `presence.heartbeat` forks NPC presence refresh detached and only for sockets with reports.
- **`relayWithRateLimit`** (`apps/gateway/src/realtime/ping-routing.ts`): relay failures answer "temporarily unavailable" without closing the socket, and the path avoids generators.
- **`air-tag-service.ts`** (`apps/gateway/src/realtime/air-tag-service.ts`): metric attributes are derived at module load and log annotations only when a log is written.
- **`PresenceExpiry`** (`apps/gateway/src/realtime/presence-expiry.ts`): the due index scores entries at `lastSeen + PRESENCE_EXPIRY_MS`, so an idle sweep reads no payloads.
- **`gateway-metrics.ts`** (`apps/gateway/src/realtime/gateway-metrics.ts`): every replica reads cluster chat totals and notifies only its own subscribers.

### Drain, readiness and liveness

- **`app.ts`** (`apps/gateway/src/app.ts`): the upgrade returns 503 with `retry-after: 1` while `hub.unavailableReason()` is set, before auth, and `open` re-checks it and closes with `tryAgainLater`.
- **`DrainTiming`** (`apps/gateway/src/app.ts`): drain waits `endpointRemoval` so Traefik drops the endpoint first, then spreads closes over `closeSpread`; `deployedDrainTiming` must stay below `terminationGracePeriodSeconds` in the infra repository.
- **`REALTIME_SERVER_CLOSE_CODES`** (`packages/protocol/src/realtime/protocol.ts`): shedding closes use 1012 for a draining restart and 1013 for overload, and clients reconnect after a random delay within `REALTIME_SERVER_CLOSE_RECONNECT_WINDOW_MS` (30 s).
- **`InboundLiveness`** (`apps/gateway/src/realtime/inbound-liveness.ts`): tracks inbound frames only, because Bun's `idleTimeout` restarts on outbound frames; its close code `REALTIME_INBOUND_TIMEOUT_CLOSE_CODE` (4009) is not shedding, so clients reconnect at once.
- **`REALTIME_CLIENT_CLOSE_CODES`** (`packages/protocol/src/realtime/protocol.ts`): use 4xxx codes with static reasons that never contain identity.

### Activity sessions and telemetry

- **`ActivityPublisher`** (`apps/gateway/src/rabbit/activity-publisher.ts`): CONNECT is recorded once per Organization, only when the session starts publishing presence there (`joinSession`), and DISCONNECT only where a CONNECT was confirmed; `activityOrganizationIds` changes only after publication.
- **`idempotencyKey`** (`apps/gateway/src/rabbit/activity-publisher.ts`): ends with a millisecond timestamp that the activity service parses to bound its duplicate lookup.
- **`connection-metrics.ts`** (`apps/gateway/src/realtime/connection-metrics.ts`): labels use only decoded discriminators and fixed outcomes, close metrics keep no reasons, users, worlds or Organizations, and payload-limit closes are classified by Bun's fixed "Received too big message" reason.
- **`GatewayRuntimeMetrics`** (`apps/gateway/src/realtime/gateway-metrics.ts`): fixed names with no identity labels, sampled independently of Redis health.

### Client join and recovery

- **`RealtimeClient`** (`packages/client/src/realtime/realtime-client.ts`): a synchronous observer suppresses only the default join on reconnect, queued joins are serialized so new credentials reach the gateway, a retryable join uses the gateway's delay, `restoreSession` repeats until the server holds the current scope set, and stale or rejected heartbeats back off on the same session instead of reconnecting.
- **`AppSocket`** (`apps/game-client/src/lib/socket.ts`) and **`GatewayClient`** (`apps/web/src/lib/gateway-client.ts`): install a no-op reconnect handler, because their providers own every join with current identity and data.
- **`socket.ts`** (`apps/game-client/src/lib/socket.ts`): a join fails without `session.hello` within `SESSION_HELLO_TIMEOUT_MS` (5 s), and after a join the socket publishes presence before readers run, because the gateway grants presence only where the character publishes.
- **`SocketProvider`** (`apps/game-client/src/contexts/socket-context.tsx`): sends the join in the same deferred commit that mounts feature listeners, retries failed joins on an open socket with `JOIN_RETRY_BASE_DELAY_MS` backoff (1–30 s), and marks the session unavailable so features load HTTP snapshots meanwhile.
- **`GatewayClient`** (`apps/web/src/lib/gateway-client.ts`): marks only a first join within `FRESH_JOIN_WINDOW_MS` (2 s) as `recover: false`; the first `session.joined` policy is the baseline, and a policy without a baseline is reported as unknown so listeners drop private data.
- **`recover` handlers** (`apps/web/src/contexts/gateway-provider.tsx`, `apps/web/src/features/guild/timers/use-timers-socket.ts`, `apps/web/src/features/guild/hero-sightings/use-hero-sightings-socket.ts`, `apps/web/src/hooks/utils/use-refresh-job-updates.ts`): refetch over HTTP only when a join sets `recover`, because the gateway does not replay missed events.
- **`useKillStatsUpdates`** (`apps/web/src/hooks/utils/use-kill-stats-updates.ts`) and **`useLiveFeed`** (`apps/web/src/features/user/dashboard/feed/use-live-feed.ts`): kill-stats events invalidate queries with one debounced timer rather than incrementing, and the live feed loads history independently of the gateway.

### Client projections

- **`map-threat-source.ts`** and **`npc-presence-source.ts`** (`apps/game-client/src/lib/map-threat-source.ts`, `apps/game-client/src/lib/npc-presence-source.ts`): apply only updates newer than the stored and snapshot revisions, because replicas may reorder them; a new access grant re-hydrates map threats over HTTP.
- **`PresenceMapIndex`** (`apps/game-client/src/lib/presence-map-index.ts`): keys presence by character and tracks session identity, so a late removal of an old session cannot remove the current one.
- **`SourceReferences`** (`apps/game-client/src/lib/scoped-source.ts`): scoped sources stop a microtask after the last release, so React can hand a subscription over within one commit.
- **`online-players-presence.ts`** (`apps/game-client/src/lib/online-players-presence.ts`): snapshot retries wait a random 1–3 s, because a timeout usually means a saturated gateway.
- **`hero-tracker-notification.ts`** (`apps/game-client/src/utils/notifications-and-detector/hero-tracker-notification.ts`): entrance deadlines cross devices as durations restarted at delivery, so clock skew neither drops nor stretches the countdown.

## Consequences

- A new server event needs a `features` flag, and old clients must keep working without it.
- Every event path applies the HTTP source policy; events without an Organization in their payload depend on routing scopes.
- Revocation relies on invalidation, revision fences and synchronous local commits; a change that awaits I/O before updating socket authority reopens a window of stale access.
- A Dragonfly stall or gap closes sessions and triggers HTTP recovery on every client, which the API must absorb.
- Hot gateway paths stay free of per-frame fibers, spans, decoding and log annotations.
- Drain timing is coupled to the infra repository's termination grace period.
