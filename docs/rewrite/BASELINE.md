# Rewrite baseline

## Identity

| Field                 | Value                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| Baseline commit       | `633f8f0157cca04ef2b609ba0e2f1903b1c28949`                                 |
| Collection date       | 2026-09-01                                                                 |
| Branch at collection  | `feature/bun-effect-rewrite`                                               |
| Read-only worktree    | `/Users/kamil/workspace/margo/lootlog-baseline` (detached, `chmod -R a-w`) |
| Package manager       | pnpm `12.1.0`                                                              |
| Workspace declaration | `apps/*`, `packages/*` in `pnpm-workspace.yaml`                            |
| Workspace count       | 30: 14 applications and 16 packages                                        |

All facts in this directory describe the Git object at the baseline commit, not later uncommitted files in the shared checkout. The separate worktree at `/Users/kamil/workspace/margo/lootlog-baseline` is detached at that SHA and has write bits removed recursively. Use it only for parity reads and baseline commands that do not need to write source files.

## Sources of truth

- `workspaces.tsv` lists every workspace and its baseline gates.
- `contracts.tsv` records the five HTTP specifications, their operation IDs, RabbitMQ, Socket.IO, persistence, cache, and job boundaries.
- `dependencies.md` records the current dependency families and rewrite targets.
- `BASELINE_RESULTS.md` records the known gate results and the Prisma generation race.
- `status.md` is the implementation ledger. Update it after each compatible slice.
- Canonical constraints remain in `PRODUCT.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `SECURITY.md`, and `docs/adr/README.md`.

## HTTP and generated clients

The repository contains five committed OpenAPI documents with 243 operations in total:

| Service   | Source                                | Operations | Document security scheme                                  |
| --------- | ------------------------------------- | ---------: | --------------------------------------------------------- |
| Activity  | `apps/activity/openapi.yaml`          |          9 | HTTP bearer                                               |
| API       | `apps/api/openapi.yaml`               |        199 | HTTP bearer                                               |
| Auth      | `apps/auth/openapi.yaml`              |          4 | none declared at document level                           |
| Battlelog | `apps/battlelog-service/openapi.yaml` |         26 | HTTP bearer; public battle routes are explicit exceptions |
| Search    | `apps/search/openapi.yaml`            |          5 | none declared at document level                           |

`packages/api-client` consumes all five files through Orval. Preserve method, path, parameters, response status and body, security, and every operation ID listed in `contracts.tsv`. Generation is a coordinated task: the root `api-client:generate` waits for all five `openapi:generate` tasks.

## RabbitMQ topology

- The main and retry exchanges are topic exchanges named `default` and `retry`.
- Gateway and API declare durable consumer queues. Retry queues expire messages back to the main exchange through `deadLetterExchange` and `deadLetterRoutingKey`; terminal failures use `.dlq` routing keys and queues. Gateway consumers use `MessageHandlerErrorBehavior.NACK` on retry-managed paths.
- Wire families cover organizations, roles and members; loot; timers; reservations v1 and v2; chat; notifications and Discord delivery; party gathering and Ready Room; activity; search indexing; events; and presence coverage.
- Gateway owns the largest fan-out set. Its queue and routing-key enums are in `apps/gateway/src/gateway/enums`, while API has a distinct backend queue namespace in `apps/api/src/enum`.
- Independently deployed consumers must keep the exact exchange, routing key, queue, payload, retry header, ack/nack, and DLQ behavior. Several payloads remain unversioned; do not silently wrap or rename them during the move to `@lootlog/protocol` and `@lootlog/messaging`.

Canonical source locations are recorded in `contracts.tsv`. The key namespaces are:

- `guilds.*`: CRUD/sync, roles, members, loot, timers, reservations, chat, notifications, party gathering, message maintenance, and refresh jobs;
- `users.party-ready-room.updated*`;
- `notifications.*` and `discord.guild.*` delivery/synchronization facts;
- `search.{npcs,players,items}.index`;
- `activity.log.create`;
- `event.*` plus `presence.coverage.check` and `presence.check.request`.

Main routing keys are exact strings. Retry-managed families add `.retry` and `.dlq` to the main key. The main set is: `guilds.create`, `guilds.sync`, `guilds.sync.trigger`, `guilds.update`, `guilds.delete`, `guilds.initialize`, `guilds.create.role`, `guilds.update.role`, `guilds.delete.role`, `guilds.members.add`, `guilds.members.remove`, `guilds.members.update`, `guilds.members.add.role`, `guilds.members.remove.role`, `guilds.members.refresh.job.update`, `guilds.loots.create`, `guilds.loots.share.update`, `guilds.loots.update`, `guilds.loots.delete`, `guilds.timers.create`, `guilds.timers.update`, `guilds.timers.delete`, `guilds.reservations.create`, `guilds.reservations.delete`, `guilds.reservations.v2.changed`, `guilds.send.message`, `guilds.delete.message`, `guilds.update.message`, `guilds.clear.messages`, `guilds.notifications.send`, `guilds.notifications.volunteer`, `guilds.party-gathering`, `guilds.party-gathering.cancel`, `users.party-ready-room.updated`, `notifications.timer.updated`, `notifications.timer.deleted`, `notifications.loot.created`, `notifications.discord.send`, `notifications.delivery.result`, `discord.guild.channels.synced`, `discord.guild.channels.sync.failed`, `discord.guild.channel.upserted`, `discord.guild.channel.deleted`, `discord.guild.sync-state.updated`, `search.npcs.index`, `search.players.index`, `search.items.index`, `activity.log.create`, `event.map-status.update`, `event.hero.killed`, `event.ranking.update`, `event.respawn-window.opened`, `event.respawn-window.closed`, `presence.coverage.check`, and `presence.check.request`.

Consumer queues use owner prefixes and must not be inferred solely from routing keys:

- API: `backend-guilds-*` main/retry/DLQ queues and `backend-presence-coverage-check`;
- Gateway: `gateway-guilds-*`, `gateway-users-party-ready-room-updated*`, `gateway-event-*`, and `gateway-presence-check-request`;
- Activity: `activity-log-create*` and `guilds-members-remove*`;
- Discord Bot: `bot-guilds-{create,delete,update,initialize,sync-trigger}` plus `discord-bot-notifications-send` in its notification consumer;
- Search: `search-npcs-index`, `search-players-index`, and the literal `search.items.index`.

## Current realtime contract

Gateway is Socket.IO 4.8.3 with Redis federation. Web and Game client use `socket.io-client` 4.8.3. The server event enum contains 39 names:

`disconnecting`, `init`, `join`, `online-players:presence:fetch`, `online-players:presence:update`, `member-web-presence:fetch`, `member-web-presence:update`, `chat-message`, `loots-create`, `loots-share-update`, `timers-create`, `timers-delete`, `reservations-create`, `reservations-delete`, `reservations-changed`, `notifications-send`, `notifications-volunteer`, `party-gathering-send`, `party-gathering-cancel`, `party-ready-room:update`, `chat-message-delete`, `chat-message-update`, `chat-messages-clear`, `members-refresh-job-update`, `permissions-updated`, `map-ping:send`, `map-ping:receive`, `air-tag:subscription`, `air-tag:observation`, `air-tag:update`, `player-presence:update`, `event-presence:update`, `event-presence:fetch`, `event:map-status:update`, `event:hero:killed`, `event:ranking:update`, `event:respawn-window:opened`, and `event:respawn-window:closed`.

Room names are server-derived:

- Organization feature room: `{guildId}:{chat|timers|notifications|loots}:{base|titans|heroes}`;
- Organization scope: `{guildId}:{admin|presence|events|online-players}`;
- User scope: `user:{discordId}:guild:{guildId}`;
- Air tag scope: `air-tags:{guildId}:{world}:{mapId}`.

All members join presence and events rooms. Admin, online-player, and tiered feature rooms require owner/admin or the corresponding access policy. Platform exclusions currently omit loot rooms for Game, chat and notifications for Web, and loot for unknown clients. Presence is socket-lifetime state and does not yet implement the target heartbeat, expiry, last-seen, revision, trust-level, or separate precise-location capability.

## Data stores

### API PostgreSQL

API uses Prisma 7.10.0. The schema owns 58 models: `Guild`, `Role`, `Member`, `Timer`, `Loot`, `ItemSnapshot`, `LootItem`, `PlayerSnapshot`, `TimerHistoryEntry`, `LootPlayer`, `NpcSnapshot`, `LootNpc`, `OrganizationLootRecord`, `LootSubmission`, `LootComment`, `LootlogConfigNpc`, `LootlogConfig`, `Reservation`, `ReservationShare`, `ReservationShareInvitation`, `UserPinnedReservationSpot`, `UserCharactersLootlogSettings`, `UserSettings`, `UserSettingDocument`, `UserGameAccountSettings`, `NotificationTarget`, `NotificationRule`, `NotificationRuleTarget`, `NotificationJob`, `WatchedItem`, `DiscordGuildChannelSnapshot`, `DiscordGuildSyncState`, `MemberRefreshJob`, `UserTimerSettings`, `UserGuildTimerSettings`, `UserSoundSettings`, `Event`, `UserPinnedEvent`, `EventMapLocation`, `EventMap`, `EventMapCoverageGap`, `EventMapAssignmentHistory`, `EventHeroNpc`, `EventPresenceLog`, `EventHeroKill`, `EventKillPoint`, `EventRanking`, `EventPointsEditHistory`, `EventRespawnWindowSummary`, `MapTemplate`, `GuildDocument`, `GuildDocumentHistory`, `NpcKillStats`, `UserKillStats`, `GuildKillSummary`, `UserKillStatsBucket`, `NpcKillStatsBucket`, and `GuildKillSummaryBucket`.

The migration chain begins at `20250625111334_initial` and is the physical-schema source of truth. Preserve names, defaults, indexes, constraints, enum values, transaction isolation, raw SQL, and advisory/row-lock behavior when adopting Drizzle.

### Activity TimescaleDB

Activity uses Prisma and owns `Activity`, `ActivityActorSnapshot`, `MemberActivityStats`, and `MemberActivitySession`. `Activity` is a TimescaleDB hypertable. The effective migrations set a one-day chunk interval and a seven-day retention policy. Composite keys and indexes introduced before hypertable adoption are compatibility constraints.

### Auth PostgreSQL

Auth already uses Drizzle 0.45.2 and owns the Better Auth physical tables `user`, `session`, `account`, `verification`, and `jwks`. Keep Better Auth column spelling, indexes, cookies, `/idp` and `/idp/*`, JWT/JWKS, provider tokens, redirects, and Redis fail-open behavior.

### Battlelog PostgreSQL and R2

Battlelog uses Drizzle `1.0.0-beta.20` and owns `battles`, `user_characters`, and `battle_warriors`. Raw battle payloads live in R2. Preserve public battle IDs/URLs, `submissionId` uniqueness, semantic fingerprint behavior, DB-to-R2 ordering and the known failure window.

Search owns only rebuildable Meilisearch indexes. Discord Bot and Gateway own no relational database.

## Jobs and schedules

| Owner     | Queue or schedule               | Purpose and compatibility note                                                                       |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| API       | BullMQ `notifications-dispatch` | Delayed and immediate notification jobs; durable DB record is coordinated with queue job ID.         |
| API       | BullMQ `member-refresh`         | Per-user/Organization Discord refresh with priority, delay, rate-limit rescheduling, and Redis lock. |
| API       | BullMQ `member-bulk-refresh`    | Bulk refresh orchestration and progress events.                                                      |
| API       | BullMQ `event-hero-kill`        | Timer/event hook processing with exponential backoff.                                                |
| API       | BullMQ `respawn-window`         | Delayed respawn-window transitions and diagnostics.                                                  |
| API       | Cron daily 03:00                | Delete expired manual timers only; controlled by retention env values.                               |
| API       | Cron daily 04:00                | Delete expired reservations beyond retention; controlled by retention env values.                    |
| Battlelog | BullMQ `delete-user-battles`    | Asynchronous user-data deletion across Battlelog storage.                                            |

RabbitMQ consumers are delivery workers too, but are inventoried separately because their queue names and ack/nack semantics are deployed contracts.

## Environment variable names

No `.env` file or secret value was read. Names below come from checked-in validation schemas.

- Activity: `ENV`, `PORT`, `SERVICE_NAME`, `APP_VERSION`, `POSTGRESQL_CONNECTION_URI`, `RABBITMQ_URI`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_USERNAME`, `API_SERVICE_URL`, `ACTIVITY_EVENT_SIGNATURE_SECRET`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_NODE_RESOURCE_DETECTORS`, `OTEL_TRACES_EXPORTER`, `SERVICE_NAMESPACE`.
- API: `ENV`, `PORT`, `SERVICE_NAME`, `POSTGRESQL_CONNECTION_URI`, `RABBITMQ_URI`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_USERNAME`, `AUTH_SERVICE_URL`, `BATTLELOG_SERVICE_URL`, `DISCORD_BOT_SERVICE_URL`, `RESERVATIONS_CARDS_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_NODE_RESOURCE_DETECTORS`, `OTEL_TRACES_EXPORTER`, `SERVICE_NAMESPACE`, `MAPS_API_URL`, `TIMER_CLEANUP_ENABLED`, `TIMER_RETENTION_DAYS`, `RESERVATIONS_CLEANUP_ENABLED`, `RESERVATIONS_RETENTION_DAYS`, `PERF_DIAGNOSTICS_ENABLED`, `PERF_DIAGNOSTICS_THRESHOLD_MS`, `PERF_DIAGNOSTICS_SAMPLE_RATE`, `NODE_WARNING_DIAGNOSTICS_ENABLED`.
- Auth: `ENV`, `PORT`, `SERVICE_NAME`, `TRUSTED_ORIGINS`, `COOKIE_DOMAIN`, `COOKIE_PREFIX`, `ADMIN_ACCOUNT_IDS`, `AUTH_SECRET`, `APP_URL`, `POSTGRESQL_PORT`, `POSTGRESQL_HOST`, `POSTGRESQL_USER`, `POSTGRESQL_PASSWORD`, `POSTGRESQL_DATABASE`, `POSTGRESQL_SSL_CA`, `DISCORD_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, standard OTel variables, `SERVICE_NAMESPACE`, `COMMIT_SHA`.
- Battlelog: `ENV`, `PORT`, `SERVICE_NAME`, `POSTGRESQL_CONNECTION_URI`, Redis connection variables, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_REGION`, `R2_BUCKET_NAME`, standard OTel variables, `SERVICE_NAMESPACE`.
- Discord Bot: `PORT`, `ENV`, `DISCORD_BOT_TOKEN`, `DISCORD_DEVELOPMENT_GUILD_ID`, `RABBITMQ_URI`, `SERVICE_NAME`, standard OTel variables, `SERVICE_NAMESPACE`.
- Gateway: `ENV`, `PORT`, `API_URL`, `AUTH_URL`, `MARGONEM_SIGNING_KEY_URL`, `RABBITMQ_URI`, `SERVICE_NAME`, Redis connection variables, standard OTel variables, `SERVICE_NAMESPACE`, `MARGONEM_ACCOUNT_PROOF_REQUIRED`, `ACTIVITY_EVENT_SIGNATURE_SECRET`.
- Search: `ENV`, `PORT`, `SERVICE_NAME`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `RABBITMQ_URI`, standard OTel variables, `SERVICE_NAMESPACE`, `COMMIT_SHA`.
- Browser build/runtime references: `VITE_ACTIVITY_API_URL`, `VITE_ADDON_INSTALL_URL`, `VITE_ADDON_URL`, `VITE_API_URL`, `VITE_AUTH_SERVICE_URL`, `VITE_BATTLELOG_API_URL`, `VITE_BATTLELOG_PUBLIC_URL`, `VITE_BUILD_TIMESTAMP`, `VITE_COMMIT_SHA`, `VITE_GAME_CLIENT_PACKAGE_VERSION`, `VITE_GAME_CLIENT_VERSION`, `VITE_GATEWAY_SOCKET_PATH`, `VITE_GATEWAY_URL`, `VITE_LOOTLOG_APP_URL`, `VITE_MARGONEM_ACCOUNT_VALIDATE_URL`, and `VITE_SEARCH_API_URL`.
- Tooling, CI, and verification also reference `ANALYZE`, `AUDIT_SAMPLE_SIZE`, `AUTH_COOKIE`, `AUTH_TOKEN`, `BASE_PATH`, `BASE_SHA`, `BATTLELOG_DATABASE_URL`, `BATTLE_WARRIOR_STATS_BACKFILL_BATCH_SIZE`, `COVERAGE_BASE_REF`, `DATABASE_URL`, `DISCORD_DEVELOPMENT_USER_ID`, `FAST_BUILD`, `GAME_CLIENT_URL`, GitHub context variables, K6 Gateway variables, `OPENAPI_GENERATION`, `OTEL_SERVICE_INSTANCE_ID`, `PULL_REQUEST_NUMBER`, `RUNTIME_REPLAY_METRICS_FILE`, `SEEDING_USER_ID`, and `WORKERS_CI_COMMIT_SHA`.

## Redis and client-storage key families

Preserve these namespaces or migrate them explicitly:

- API authorization and reads: `perms:*`, `auth:idp-token:*`, `guild:*`, `user-lootlog-config:*`, `member-read:*`, `event-read:v2:*`, `event-wrapped:v2:*`.
- API domain state: `party-ready-room:v3:{room|organizer|user|character}:*`, `notification:*`, `guild:*:messages`, `maps:all`, `reservations:catalog:v2`, `timer:{lock|dedup|list}:*`, `kill:{dedup|stats}:*`, `loots:list:*`, `loot-stats:*`, `event:hero:kill:lock:*`, `presence:lock:*`, `member:refresh:lock:*`, `guild-stats-card:*`.
- Discord cache/rate limit: `user:{userId}:discord:{discordId}:*` and `discord:ratelimit:user:*`.
- Auth: `auth:better-auth:*`.
- Battlelog: ingestion/idempotency keys plus `battle-characters:list:*`, `battle-worlds:*:list`, analytics, metadata, and R2 caches.
- Gateway: Redis Socket.IO adapter state, user-guild caches, live presence, and air-tag hashes/sorted sets. Room families are listed above.
- Game-client persisted settings are protected contracts. Known roots include `ll:settings:state`, `ll:hotkeys:state`, `ll:chat:state`, `ll-timers-state`, `ll-windows-state`, `ll-online-players-state`, `ll:logs:state`, `ll:battle-panel:state`, and `lootlog:margonem-character-list:v1:*`.

## Protected invariants

- `Guild` in code means the Discord guild anchoring one Lootlog Organization, never a Margonem clan.
- Every query, aggregate, cache key, job, event, room, search projection, comment, history item, and notification preserves the Organization boundary.
- Existing HTTP, RabbitMQ, database, Margonem callback/object, userscript preference, and public battle-link behavior stays compatible unless this rewrite contains an explicit coordinated migration.
- The intended Socket.IO-to-WebSocket cutover is deliberately breaking and therefore ships Gateway, Web, and Game client together.
- Presence is the only intentional capability expansion. All other known gaps remain behavior-parity risks, not invitations to redesign.
