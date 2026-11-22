# 0007. Organization access and privacy rules

Status: accepted

## Context

The Organization is Lootlog's security boundary (see ADR 0001). The API serves
Organization endpoints and cross-Organization reads (`/me`, the Game client,
write fan-out, API keys, background jobs), while the activity, catalog,
gateway, Web app, and Game client each decide what to show from the same
policy without copying its state. Every source query, derived view,
notification, cache, and realtime delivery must apply the same owner and
active-Member rules, fail closed, and not reveal that a hidden record exists.

Access changes at any moment through Discord roles and ownership, so cached
access must be refreshed without waiting on Discord for every request, and a
revocation must remove data from every client immediately. A few surfaces
cross Organizations on purpose (global chat, the public catalog, public
player lists, link previews) and must carry no identifiers.

## Decisions

### Shared policy rules

- **`memberCapabilities`** (`packages/domain/src/access-policy.ts`): The Discord guild owner gets OWNER and every other member the union of their role permissions; callers still decide whether the member row is active.
- **`AccessRequirement`** (`packages/domain/src/access-policy.ts`): Shared requirements are named once (ADMINISTER is ADMIN; MODERATE is ADMIN or LOOTLOG_MANAGE) so every surface checks them the same way; OWNER satisfies both through `resolveCapabilities`.
- **`capabilitiesGrantingAny`** (`packages/domain/src/access-policy.ts`): A requirement expands to every raw role permission that grants it, so storage queries over raw role permission arrays agree with `resolveCapabilities`.
- **`canReadNpcFeatureSource`** (`packages/domain/src/npc-permissions.ts`): This is the single NPC feature visibility rule for every surface: the role needs the feature's base permission plus the NPC routing tier permission within its level range. Owner, ADMIN, and party-gathering organizer bypasses are resolved by each caller, and a source without `npcLevel` skips the range check.
- **`canReadHeroSighting`** (`packages/domain/src/npc-permissions.ts`): A sighting applies the hero's own NPC visibility because it reveals where that hero is.
- **`getNpcRoutingTier`** (`packages/domain/src/npc-routing.ts`): Any NPC named like a Hero Tracker routes to the `HERO_TRACKER` tier before weight checks, because trackers report no weight or profession and would otherwise reach everyone with the base permission.
- **`isRoutableNpcSource`** (`packages/domain/src/npc-routing.ts`): Visibility callers deny when this is false, because `getNpcRoutingTier` defaults unclassifiable NPCs to the base tier and would grant NPC-scoped sources to anyone with the feature's base permission.
- **`canReadChatNpcSource`** (`apps/api/src/chat/chat-npc-visibility.ts`): An NPC that cannot be classified into a routing tier is denied, matching the realtime socket's `canReadFeatureEvent`. The same rule hides a gathering NPC with an unclassifiable free-form `type` in `apps/api/src/messaging/ready-room/ready-room-visibility.ts`.
- **`isDiscordAdministrator`** (`apps/api/src/discord/is-discord-administrator.ts`): A malformed Discord permissions bitfield fails closed and grants no administrator access.

### Member access resolution in the API

- **`isActiveMember`** (`apps/api/src/members/member-access-query.ts`): Role access goes only to an active Member linked to a User; the Organization context and cross-Organization queries share this rule.
- **`selectAccessibleGuilds`** (`apps/api/src/members/member-access-query.ts`): Cross-Organization reads for `/me`, the Game client, and write fan-out trust `Guild.ownerId` and stored Members and roles and never wait for Discord, so they are eventually consistent. Organization endpoints instead refresh the caller's Member past the soft TTL and require that row even for the owner.
- **`selectGuildIdsGrantingPermissions`** (`apps/api/src/members/member-access-query.ts`): The owner and active-member rules apply only over Organizations already resolved for the requester, so an API key's scope stays applied.
- **`UserGuildPermissions`** (`apps/api/src/members/user-guild-permissions.ts`): The owner keeps access without a Member row, matching the access query, and gets a synthetic `owner` role holding every capability over the default level range because clients derive access from roles.
- **`callerFailure`** (`apps/api/src/members/member-commands.data-layer.ts`): Only the caller's own Discord authorization failure becomes `ReauthenticationRequired`, so another User's Discord token problem never asks the caller to sign in again.
- **`guildAccess`** (`apps/api/src/runtime/auth/organization-authorization-layers.ts`): Organization access resolves identically for every handler port, but not-found and forbidden map into each port's own tagged errors because `Effect.catchTags` and HTTP status mapping dispatch on them; `ReauthenticationRequired` passes through since the bearer middleware declares it everywhere.
- **`getInternalMemberIdentity`** (`apps/api/src/http-api/handlers/internal/internal.handlers.ts`): The Discord bot acts for a User only when that User is an active Member with a known Lootlog User; every other case returns the same 404, so the bot cannot tell a missing guild from a missing Member.
- **`GlobalChatAdminDirectory`** (`apps/api/src/runtime/features/global-chat-admins.ts`): Global chat admins are configured Users plus holders of the auth-service-owned `global-chat-admin` platform role; without the service credential only configured Users are admins.
- **`getUserPermissions`** (`apps/activity/src/activities/activity-permissions.ts`): The activity service fetches a User's grants from the API on every request and keeps no copy, because the API owns the grants cache and invalidates it when a Member leaves or roles change.

### Organization context and identity caches

- **`REFRESH_AHEAD_FRACTION`** (`apps/api/src/runtime/auth/organization-context.ts`): The context cache serves a Member until the soft TTL, queues a background refresh past two thirds of it, keeps serving the stored Member during the stale-access grace, and makes a request wait for Discord only for an unconfirmed Member or one past the grace.
- **`STALE_REFRESH_RETRY_SECONDS`** (`apps/api/src/runtime/auth/organization-context.ts`): Past the soft TTL a failed background refresh is queued again after 60 seconds.
- **`refreshAheadKey`** (`apps/api/src/runtime/auth/organization-context.ts`): The refresh-ahead marker lives until the context stops being fresh plus one retry interval, so each User and Organization has at most one queued refresh; a failed enqueue deletes its marker so the retry is not blocked until the soft TTL.
- **`CachedMemberEntry`** (`apps/api/src/runtime/auth/organization-context.ts`): Only the Member and roles are cached, because they cost a Discord sync; the guild row and derived capabilities are read on every lookup so configuration changes apply without eviction. A Member whose last Discord status is UNAUTHORIZED is never served from storage, because only a Discord sync can tell the caller to sign in again.
- **`Guild_vanityUrl_not_id_like_check`** (`apps/api/src/database/drizzle/organization.schema.ts`): A vanity URL may not be empty or all digits, so it can never be mistaken for a Discord snowflake Organization id in routes.
- **`GUILD_CACHE_KEY_PREFIX`** (`apps/api/src/guilds/guild-configuration-cache.ts`): The lookup cache uses the `guild-lookup:v2` prefix because v1 shared one namespace for ids and vanity URLs, so a vanity URL equal to another Organization's id overwrote its entry; the new prefix leaves every v1 entry unread.
- **`getGuildCacheKey`** (`apps/api/src/guilds/guild-configuration-cache.ts`): Ids and vanity URLs live in separate namespaces and an id-like value maps only to the id namespace.
- **`writeGuildConfigurationCache`** (`apps/api/src/guilds/guild-configuration-cache.ts`): An Organization is cached only under the key it was looked up by, so one Organization can never write another's entry; a configuration change in `apps/api/src/guilds/guild-configuration-data.ts` therefore evicts the id entry and both the old and new vanity URL entries.
- **`readCachedGuild`** (`apps/api/src/guilds/guild-configuration-cache.ts`): An entry that fails to decode, or sits under an id key while describing another Organization, is evicted and reloaded instead of served.

### Access projection and delivery

- **`queueRoleHolders`** (`apps/api/src/guilds/guild-lifecycle.operations.ts`): Role permission changes queue the role holders in the `MemberSyncDelivery` outbox inside the transaction, so a cache invalidation or publication that fails after commit is repaired by the outbox instead of depending on a redelivered Discord event that would see no change.
- **`queueOwnerRebalance`** (`apps/api/src/guilds/guild-lifecycle.operations.ts`): Owner access comes from the Organization row, so an ownership change queues the owners' Member deliveries and gateway rebalance itself, in the same transaction. Because Discord replays guild creation for known guilds, this happens only on activation or an ownership transfer.
- **`deleteRole`** (`apps/api/src/guilds/guild-lifecycle.operations.ts`): Role deletion queues the role's holders before deleting it, because assignments cascade with the role; roles without permissions are skipped since projections omit them. Guild deletion likewise queues the active Members inside the transaction, because a redelivered deletion no longer sees them as active.
- **`updateRole`** (`apps/api/src/guilds/roles-data.ts`): Saving a role republishes its holders even when permissions are unchanged, because a previous attempt may have committed the policy before invalidation or delivery failed.

### Source visibility in API reads and writes

- **`apiKeyOrganizationFilter`** (`apps/api/src/runtime/auth/organization-scope.ts`): Source queries are constrained to the API key's Organizations before pagination, aggregation, or write fan-out, so a key never sees or affects other Organizations' rows, even in counts.
- **`apiKeyAccessibleGuilds`** (`apps/api/src/runtime/auth/organization-scope.ts`): The result is the Organizations granted to both the API key and its User, and `undefined` for a session, which keeps the calling endpoint's scope.
- **`requestApiKeyAccess`** (`apps/api/src/runtime/auth/forward-auth-identity.ts`): Outside a request there is no API-key scope, because background jobs have no request identity and keep their own domain scope.
- **`activeRecordsOfOrganization`** (`apps/api/src/loots/query/loot-query.repository.ts`): The loot page selection is scoped only by the Organization's own active `OrganizationLootRecord` rows, with no join to `Loot`, so another Organization's record cannot enter the result.
- **`readVisibleSummaries`** (`apps/api/src/loots/query/loot-query.repository.ts`): Shared loot data is read by id without an access check; callers resolve source visibility before passing ids.
- **`deniedOrHidden`** (`apps/api/src/loots/allocation/loot-allocation.operations.ts`): A loot the actor cannot read is reported as missing, not forbidden, on every loot path, so its existence is not revealed. Draw entrants in `apps/api/src/loots/loots.operations.ts` are built from the loot as the caller may see it.
- **`readCharacterNames`** (`apps/api/src/loots/query/user-loot-stats.ts`): A character's name comes only from the latest snapshot among loots the User may see, so a name observed only in hidden loots is never revealed.
- **`acceptWithLock`** (`apps/api/src/loots/submission/loot-submission-acceptance.service.ts`): A character that catches for no writable Organization is rejected even if the client should have skipped it, because a stale client cannot be trusted to filter. `selectCharacterCatchingGuildIds` in `apps/api/src/members/character-catching-guilds.ts` likewise returns the character's configured Organizations, which callers must intersect with the writable ones.
- **`writableByOwner`** (`apps/api/src/lootlog-config/user-lootlog-config-data.ts`): A stored Lootlog configuration outlives Discord membership, so it is shown only for Organizations where the owner can still submit loot.
- **`visibilityFilter`** (`apps/api/src/kills/kill-query-support.ts`): Kill statistics reveal the same NPCs as loots, so only the OWNER recovery capability bypasses role NPC coverage, as in `canViewLoot`; a caller with no roles sees no NPC types.
- **`makeManualHeroSightings`** (`apps/api/src/hero-sightings/hero-sightings.data-layer.ts`): A manual sighting of a known hero keeps the recorded name and level, so a typed level cannot move the hero into another role's range. The create response follows read visibility, not write permission.
- **Timer search** (`apps/api/src/timers/timer-search.data-layer.ts`): Visibility applies per batch and reading continues until the limit is filled, so hidden timers never take a visible result's place.
- **`writableReservationGuildIds`** (`apps/api/src/reservations/reservation-mutations.data-layer.ts`): Changing one's own reservations needs the same read and write capabilities as the Organization reservation endpoints, and the reservation lookup type requires at least one SQL condition so it can never match every row.
- **Reservation presentation** (`apps/api/src/reservations/reservation-presentation.ts`): The author's `userId` is exposed only when the source Organization is the viewer's own, since only viewers inside it may open the author's profile.
- **`readPublishedFeedEntry`** (`apps/api/src/users/user-feed.ts`): A feed group is read once for publication and the gateway applies each recipient's source visibility before delivery.

### Notifications and gatherings across Organizations

- **`notificationLootSourceCondition`** (`apps/api/src/notifications/notification-loot-source-visibility.ts`): A loot-sourced notification job is shown only while every Organization in its retained payload still exposes the source loot to the viewer.
- **`notificationJobVisibilityFilter`** (`apps/api/src/notifications/notification-api-key-scope.ts`): Each job's original source scopes, including current loot visibility, are checked before the history limit, so hidden jobs neither appear nor consume the limit.
- **`notificationRulesInApiKeyScope`** (`apps/api/src/notifications/notification-api-key-scope.ts`): Reservation jobs are scoped by their retained source, so renaming the shared rule cannot widen access, and API-key sessions can never manage the shared reservation reminder rule because it spans Organizations.
- **`handleLootDrawResolved`** (`apps/api/src/notifications/delivery/notifications-events.handler.ts`): A draw result notifies once per outcome and posts even when the loot is hidden from some Members, because the Organization chooses which channel its rule posts to.
- **`NotificationGoingUpdateSchema`** (`packages/schema/src/notification-going.ts`): A Member's "I'm going" answer is scoped to one Organization and delivered only where the caller could read the notification (`apps/api/src/messaging/messaging.data-layer.ts`).
- **`SINGLE_GUILD_REQUIRED`** (`apps/api/src/messaging/messaging.data-layer.ts`): A party gathering must reach exactly one Lootlog; the data layer rejects anything else even though the request schema already limits it.
- **`closeKilledNpcRooms`** (`apps/api/src/messaging/ready-room/ready-room-lifecycle.ts`): A gathering closes only when every participating Lootlog recorded the kill, because closing tells every participant why and another Organization's kill must not reveal itself. The auto timer path in `apps/api/src/timers/timer-auto.data-layer.ts` closes them idempotently, without delaying the kill report.
- **`GuildHeroSightingUpdated`** (`packages/protocol/src/rabbit/events.ts`): The event exposes only the Organization, world, and hero level, because the gateway routes and authorizes sighting updates by those fields.

### Client caches follow access in real time

- **`applyChatAccessPolicy`** (`apps/game-client/src/features/chat/chat-access-policy.ts`): On revocation, affected queries are cancelled first and pruned afterwards, because cancellation reverts state synchronously and a late response must not restore revoked rows. On reconnect, in-flight history requests finish and the Organization is reconciled once more afterwards.
- **`permissionGenerationRef`** (`apps/game-client/src/features/chat/hooks/use-chat-messages.ts`): A counter bumped on every permission change drops asynchronously resolved mentions that started before it. `useChatMessages` also discards messages queued in `chatCacheBatcher`, while `SocketProvider` prunes cached histories; both are needed.
- **`GATHERING_ACCESS_AREAS`** (`apps/game-client/src/features/chat/hooks/use-active-party-gatherings.ts`): Active gatherings are re-read only for `chat`, `notifications`, and `organization` access changes; presence is granted after every gateway join and would cause needless rereads. A restricting change resets the query so revoked rooms vanish, a pure grant only invalidates, and the query uses `refetchOnMount: false` because socket pushes keep the cache live.
- **Active gatherings cache** (`apps/game-client/src/features/chat/active-party-gatherings-cache.ts`): A gathering's `guildIds` are unioned across pushes because each push carries only the receiving Organization. Absence from discovery means possibly lost access, not termination; only a REMOVE event ends a room.
- **`usePartyReadyRoomSync`** (`apps/game-client/src/features/party-finder/hooks/use-party-ready-room-sync.ts`): The Ready Room collection is dropped instead of merged when the character, world, or gathering permissions change, because such a change can hide rooms.
- **Notification access policy** (`apps/game-client/src/features/notifications/notification-access-policy.ts`): A chat mention with absent `sourceNpc` is denied, while `null` marks a verified plain message. A revoked Organization is removed from a grouped entry's `servers`, `guildId`, and report counts.
- **`reportCountByGuildId`** (`apps/game-client/src/store/notifications.store.ts`): Rows remember recent report ids so a report delivered through several Organizations joins once, and count reports by the Organization they first arrived through so revocation drops them.
- **Game access cache** (`apps/game-client/src/lib/game-access-cache.ts`): On a policy change, in-flight scoped queries are cancelled and refetched, except the global timer reader's first request, which filters against the latest policy before caching. `/hero-sightings` uses the timer visibility rule because a sighting names only the hero level.
- **`useAccessibleGuilds`** (`apps/game-client/src/hooks/api/use-accessible-guilds.ts`): The query refetches when the policy version changed mid-request and an Organization's metadata is missing; bootstrap-seeded guilds in `apps/game-client/src/lib/game-client-bootstrap.ts` pass the same filter.
- **`cacheUsable`** (`apps/game-client/src/hooks/game-events/use-online-character-owners.ts`): Cached online-character owners are dropped as soon as the Organization, world, or socket connection changes.
- **`clearRestricted`** (`apps/web/src/features/guild/hero-sightings/use-hero-sightings-socket.ts`): A restriction cancels and removes cached sightings immediately, and clears every Organization's cache when the revoked Organization's vanity alias may be unknown. `clearRestrictedTimers` in `apps/web/src/features/guild/timers/use-timers-socket.ts` does the same for timers.
- **`useLiveLootList`** (`apps/web/src/features/guild/loots-list/components/loots-list/use-live-loot-list.ts`): The current Organization is treated as revoked only once the User's guilds have loaded, because until then `currentGuildId` may be the route's vanity alias.
- **`handlePermissions`** (`apps/web/src/features/user/dashboard/feed/use-live-feed.ts`): On `permissions.updated` the feed cancels pending fetches and drops revoked Organizations' rows at once, keeping other rows mounted; revalidation runs even while live updates are paused.

### Presence

- **`usePresencePublicationScope`** (`apps/game-client/src/hooks/use-presence-publication-scope.ts`): A character publishes presence only to the Lootlogs it catches for, and the gateway shows it only those Lootlogs' presence, so nobody watches presence incognito.
- **`setPresenceOrganizations`** (`apps/game-client/src/lib/socket.ts`): Presence is published only once the character's catching Lootlogs are known; while unknown nothing is published, so another character's scope never leaks.
- **`canReadPresence`** (`apps/game-client/src/lib/online-players-presence.ts`): The client relies on the listed `LOOTLOG_ONLINE_PLAYERS_READ` permission alone, because the gateway already lists owner and administrator permissions and withholds presence where the character does not publish.
- **`PublicOnlinePlayer`** (`packages/game-client-api/src/index.ts`): The public online-players list carries no User, session, or account identifiers.

### Web app presentation gates

- **`canViewHeroSightings`** (`apps/web/src/lib/hero-sightings-permissions.ts`): Client gates decide only what to request and show; the API remains the boundary. `GuildSearch` in `apps/web/src/features/guild/loots-list/components/loots-filters/guild-search.tsx` offers loot search while the policy loads for the same reason.
- **`isGuildOwner`** (`apps/web/src/hooks/context/use-is-owner.ts`): Both ids must be present before comparing, because both are undefined while loading and `undefined === undefined` would grant owner-only UI.
- **`GuildNavItem`** (`apps/web/src/components/layout/guild-nav-item.tsx`): No lock mark is shown when access data is stale, because it would present a guess as current truth.
- **`getGuildDiscordPermissionStatus`** (`apps/web/src/lib/get-guild-discord-permission-status.ts`): A `STALE` sync with a last success and no error counts as confirmed, because the API still enforces the last successful sync; a failed read or a never-synced snapshot carries no evidence.

### Cross-Organization and public surfaces

- **`GlobalChatMessageSchema`** (`packages/schema/src/chat.ts`): Global chat names the sender only by Discord display name and carries no User, Discord, Organization, or character identifier; `isAdmin` and worlds are optional only for messages stored before channels existed.
- **`CatalogAccess`** (`apps/catalog/src/http-api/catalog-access.ts`): Every catalog read needs a caller: a User or API key identified by edge forward-auth headers, or a service holding the catalog token. The edge strips identity headers it did not set, so a request with neither is refused.
- **`CatalogGroup`** (`apps/catalog/src/http-api/contracts/catalog/api.ts`): The public catalog exposes only Organization-free game facts: no player, world, or Organization, and first sightings as days, not times.
- **`CatalogReportsGroup`** (`apps/catalog/src/http-api/contracts/reports/api.ts`): Reports name no Organization, the reporter stays inside the catalog service, and only configured moderators review them. `asCaller` in `apps/catalog/src/http-api/handlers/reports.handlers.ts` requires a signed-in User, so a service token can read but cannot report.
- **`createBattleLinkPreview`** (`apps/traffic-splitter/src/battle-link-preview.ts`): Known link-preview bots on public battle URLs get a small document with Open Graph tags, because they never run JavaScript; people still get the Web app. The response is `private, no-store` with `vary: User-Agent` so no shared cache serves it to a person.
- **`makeShareToken`** (`apps/api/src/http-api/handlers/user-themes/user-themes.handlers.ts`): Theme share tokens are 128 random bits in URL-safe base64, because the link itself is the permission. A User may select only their own custom theme; another User's id is treated as missing (`apps/api/src/http-api/handlers/users/users.handlers.ts`).

### Character auras

- **`makeCharacterAurasData`** (`apps/api/src/character-auras/character-auras.data-layer.ts`): Auras belong to holders of the `admin` platform role, the only Users who grant them, and to Users an admin granted them to; global chat moderation gives no aura rights, and show only while the chooser is the User who last proved to play the account and still has access. Revoking a grant deletes the User's auras; a User dropped from the admins keeps hidden choices and may only remove them.
- **`PERSONAL_CHARACTER_AURA_IDS`** (`packages/schema/src/character-aura.ts`): Personal auras are granted to a User by name only; a general grant does not cover them, and admin auras are chosen only by admins.
- **`CharacterAurasCache`** (`apps/api/src/character-auras/character-auras.data-layer.ts`): All auras and grants are cached as one shared copy, because they belong to a handful of Users and every Game client reads them at startup.
- **`shownAuras`** (`apps/api/src/character-auras/character-auras.data-layer.ts`): The `DISTINCT ON ("accountId")` latest-proof lookup is limited to accounts that have an aura, avoiding a full scan of `UserMargonemAccount`.
- **`isCharacterAuraId`** (`apps/api/src/character-auras/character-auras.data-layer.ts`): A stored aura the Game client no longer draws reads as no aura, so removing one from the catalogue never breaks reads.
- **`characterAuraTable`** (`apps/api/src/database/drizzle/user.schema.ts`): `userId` has no foreign key because Users live in the auth service's database; `GlobalChatMute.userId` in `apps/api/src/database/drizzle/global-chat.schema.ts` follows the same rule, with one mute per User where null lasts until lifted.

### Untrusted input

- **`splitWritablePath`** (`packages/domain/src/settings-paths.ts`): Client patch paths with `__proto__`, `constructor`, or `prototype` segments are rejected before any write, because they could reach `Object.prototype` through `setPath`.
- **`rejectProtoKey`** (`packages/protocol/src/realtime/codec.ts`): `parseRealtimeJson` rejects any `__proto__` key, because receivers that copy keys by assignment would turn it into a prototype.
- **`SearchText`** (`packages/schema/src/http-scalars.ts`): Search text is matched only through a LIKE pattern built by the API's `containsPattern`, which escapes `%`, `_`, and `\`.
- **`readTranslationText`** (`apps/web/src/components/battle/utils/battle-log-visible-text.ts`): Translation markup is stripped before entities in interpolated player names are decoded, so the battle log's visible text is always plain text.
- **`GuildDocLinkOpenPlugin`** (`apps/web/src/features/guild/docs/editor/guild-doc-link-open-plugin.tsx`): Read-only document links open in a new tab without `window.opener`, because link targets and `rel` come from stored documents any docs writer controls.
- **`LootDrawHistory`** (`apps/web/src/features/guild/loots-list/components/loot-draw/loot-draw-history.tsx`): The Member-written void reason is passed as a `Trans` child instead of interpolated into translated markup, so it is never parsed as markup.

## Consequences

- Every new read, aggregate, notification, or realtime path must pick the matching shared rule from `packages/domain` and fail closed on unclassifiable sources.
- Cross-Organization reads are eventually consistent with Discord; only Organization endpoints pay for a fresh Member check.
- Every access-changing write must queue its outbox deliveries in the same transaction, or a failed invalidation leaves stale access in caches and rooms.
- Each client cache keyed by Organization needs an explicit revocation path that removes data before any refetch, and must handle vanity aliases it can no longer resolve.
- Hidden records are reported as missing, so debugging access problems relies on server-side logs rather than error codes.
