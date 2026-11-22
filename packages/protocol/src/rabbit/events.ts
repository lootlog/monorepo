import { NotificationGoingUpdateSchema } from "@lootlog/schema/notification-going";
import { UserFeedItem } from "../feed.js";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import {
  DateTimeWithOffsetString,
  PositiveSafeInteger,
  SafeInteger,
} from "@lootlog/schema/http-scalars";
import {
  DiscordGuildChannel,
  DiscordGuildSyncState,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
import {
  DiscordNotificationDeliveryResultSchema,
  DiscordNotificationSendCommandSchema,
  LootCreatedNotificationEventV2Schema,
  LootDrawResolvedNotificationEventSchema,
} from "@lootlog/schema/notifications";
import {
  CatalogItemObservation,
  CatalogItemRevisions,
  CatalogMonsterDrops,
  CatalogMonsterLocations,
  CatalogNpcObservation,
} from "./catalog.js";
import { NonNegativeInt } from "@lootlog/schema/primitives";
import { PartyGatheringUpdateEnvelopeSchema } from "@lootlog/schema/party-ready-room";
import { CharacterAurasChangedSchema } from "@lootlog/schema/character-aura";
import {
  GlobalChatChannelUpdateSchema,
  GlobalChatMessageSchema,
} from "@lootlog/schema/chat";
import { Schema } from "effect";
import { RabbitRoutingKey } from "./topology.js";
import {
  GuildLootCreatedMessageV2,
  GuildLootShareUpdatedEventV2,
  ReservationChangedEventV2,
} from "../loot-events.js";

export const GameCharacterOffline = Schema.Struct({
  userId: Schema.NonEmptyString,
  discordId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  characterId: Schema.NonEmptyString,
  organizationIds: Schema.Array(Schema.NonEmptyString),
  disconnectedAt: NonNegativeInt,
});

export type GameCharacterOffline = typeof GameCharacterOffline.Type;

/**
 * The gateway verified Margonem's signed proof that the User plays this
 * Margonem account. Facts may arrive late or twice; `verifiedAt` orders them.
 */
export const MargonemAccountVerifiedV1 = Schema.Struct({
  version: Schema.Literal(1),
  userId: Schema.NonEmptyString,
  accountId: Schema.NonEmptyString,
  characterId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  verifiedAt: DateTimeWithOffsetString,
});

export type MargonemAccountVerifiedV1 = typeof MargonemAccountVerifiedV1.Type;

const NullableString = Schema.NullOr(Schema.String);

const GuildRole = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  color: Schema.Number,
  admin: Schema.Boolean,
  position: Schema.Number,
});

// A bot released before banners omits `banner`; the API then keeps the stored
// one instead of clearing it.
const GuildBanner = Schema.optionalKey(NullableString);

export const GuildCreated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  icon: NullableString,
  banner: GuildBanner,
  ownerId: Schema.NonEmptyString,
  roles: Schema.Array(GuildRole),
});

export const GuildUpdated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  icon: NullableString,
  banner: GuildBanner,
  ownerId: Schema.NonEmptyString,
});

export const GuildDeleted = Schema.Struct({ guildId: Schema.NonEmptyString });

export type GuildCreated = typeof GuildCreated.Type;

export type GuildUpdated = typeof GuildUpdated.Type;

export type GuildDeleted = typeof GuildDeleted.Type;

export const GuildRoleChanged = Schema.Struct({
  guildId: Schema.NonEmptyString,
  ...GuildRole.fields,
});

export const GuildRoleDeleted = Schema.Struct({
  guildId: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
});

export type GuildRoleChanged = typeof GuildRoleChanged.Type;

export type GuildRoleDeleted = typeof GuildRoleDeleted.Type;

export const GuildMemberChanged = Schema.Struct({
  guildId: Schema.NonEmptyString,
  discordId: Schema.NonEmptyString,
  userId: Schema.NonEmptyString,
});

const PresenceCheckRequested = Schema.Struct({
  guildId: Schema.NonEmptyString,
  mapName: Schema.NonEmptyString,
});

const PresenceCoverageChecked = Schema.Struct({
  guildId: Schema.NonEmptyString,
  mapName: Schema.NonEmptyString,
  discordId: Schema.NonEmptyString,
  hasPlayer: Schema.Boolean,
  isAfk: Schema.optional(Schema.Boolean),
});

const DiscordGuildChannelsSynced = Schema.Struct({
  guildId: Schema.NonEmptyString,
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
});

const DiscordGuildChannelUpserted = Schema.Struct({
  guildId: Schema.NonEmptyString,
  channel: DiscordGuildChannel,
  syncState: DiscordGuildSyncState,
});

const DiscordGuildChannelsSyncFailed = Schema.Struct({
  guildId: Schema.NonEmptyString,
  status: DiscordGuildSyncStatus,
  lastAttemptAt: Schema.NonEmptyString,
  lastError: Schema.NonEmptyString,
});

const DiscordGuildSyncStateUpdated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  syncState: DiscordGuildSyncState,
});

const OrganizationScopedEvent = Schema.Union([
  Schema.Struct({ guildId: Schema.NonEmptyString }),
  Schema.Struct({ organizationId: Schema.NonEmptyString }),
]);

/**
 * A changed hero sighting, as the API's sighting response. The gateway reads
 * only the Organization, world and hero level it routes and authorizes by.
 */
const GuildHeroSightingUpdated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  hero: Schema.Struct({ lvl: NonNegativeInt }),
});

const PartyReadyRoomUpdated = Schema.Struct({
  recipientDiscordId: Schema.NonEmptyString,
  eligibleGuildIds: Schema.Array(Schema.NonEmptyString),
  update: Schema.Unknown,
});

// A refresh hint for the one user whose personal kill statistics a kill
// changed. Kills of other Organization members never change them.
const UserKillStatsChanged = Schema.Struct({
  recipientUserId: Schema.NonEmptyString,
});

const NotificationVolunteer = Schema.Struct({
  notificationId: Schema.NonEmptyString,
  targetDiscordId: Schema.NonEmptyString,
  volunteerDiscordId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  character: Schema.Unknown,
});

export const GuildKillsAcceptedV1 = Schema.Struct({
  sourceNpcs: Schema.optional(
    Schema.Array(Schema.Struct({ level: NonNegativeInt, type: NpcTypeSchema })),
  ),
  feedEntry: Schema.optional(UserFeedItem),
  version: Schema.Literal(1),
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  npc: Schema.Struct({ type: NpcTypeSchema, lvl: NonNegativeInt }),
});

export type GuildKillsAcceptedV1 = typeof GuildKillsAcceptedV1.Type;

const EventScope = Schema.Struct({
  guildId: Schema.NonEmptyString,
  eventId: Schema.NonEmptyString,
});

const EventMapStatusUpdated = Schema.Struct({
  ...EventScope.fields,
  heroNpcLvl: Schema.optional(Schema.NullOr(NonNegativeInt)),
  mapId: Schema.NonEmptyString,
  reason: Schema.optional(Schema.String),
});

const EventHeroKilled = Schema.Struct({
  ...EventScope.fields,
  heroNpcLvl: Schema.optional(Schema.NullOr(NonNegativeInt)),
  killId: Schema.NonEmptyString,
});

const EventRespawnWindowChanged = Schema.Struct({
  ...EventScope.fields,
  heroNpcLvl: Schema.optional(Schema.NullOr(NonNegativeInt)),
  heroId: Schema.NonEmptyString,
});

const ActivityActorSnapshot = Schema.Struct({
  accountId: Schema.optional(Schema.Number),
  characterId: Schema.optional(Schema.Number),
  name: Schema.optional(Schema.String),
  clanName: Schema.optional(Schema.String),
  clanId: Schema.optional(Schema.Number),
  icon: Schema.optional(Schema.String),
  lvl: Schema.optional(Schema.Number),
  prof: Schema.optional(Schema.String),
});

/** A signed session activity; see `activity-signature`. */
export const ActivityLogCreated = Schema.Struct({
  userId: Schema.NonEmptyString,
  guildId: Schema.NonEmptyString,
  discordId: Schema.NonEmptyString,
  type: Schema.Literals(["CONNECT_EVENT", "DISCONNECT_EVENT"]),
  source: Schema.Literals(["GAME", "WEB_APP"]),
  world: Schema.optional(Schema.String),
  details: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  actorSnapshot: Schema.optional(ActivityActorSnapshot),
  idempotencyKey: Schema.NonEmptyString,
});

export type ActivityLogCreated = typeof ActivityLogCreated.Type;

/** A player as the search index keeps it, under `playerSearchId`. */
export const SearchPlayer = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  characterId: Schema.Number,
  accountId: Schema.Number,
  world: Schema.String,
});

export type SearchPlayer = typeof SearchPlayer.Type;

export const playerSearchId = (characterId: number, accountId: number) =>
  `${characterId}${accountId}`;

const NotificationTimerUpdated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  npcId: SafeInteger,
  timerKey: Schema.NonEmptyString,
  minSpawnTime: Schema.NonEmptyString,
  maxSpawnTime: Schema.NonEmptyString,
  npc: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        name: Schema.optional(Schema.String),
        templateId: Schema.optional(Schema.NullOr(PositiveSafeInteger)),
      }),
    ),
  ),
});

const NotificationTimerDeleted = Schema.Struct({
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  timerKey: Schema.NonEmptyString,
  npcId: Schema.optional(SafeInteger),
});

const DiscordGuildChannelDeleted = Schema.Struct({
  guildId: Schema.NonEmptyString,
  channelId: Schema.NonEmptyString,
  syncState: DiscordGuildSyncState,
});

/** Cumulative confirmed game presence. A gap starts a new segment; retries never extend it. */
export const UserOnlineCheckpointV1 = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("checkpoint"),
  userId: Schema.NonEmptyString,
  sessionId: Schema.NonEmptyString,
  segmentId: Schema.NonEmptyString,
  world: Schema.optional(Schema.NonEmptyString),
  startedAt: DateTimeWithOffsetString,
  endedAt: DateTimeWithOffsetString,
  observedAt: DateTimeWithOffsetString,
}).check(
  Schema.makeFilter(
    (event) =>
      Date.parse(event.startedAt) <= Date.parse(event.endedAt) &&
      Date.parse(event.endedAt) <= Date.parse(event.observedAt),
    { expected: "ordered confirmed interval timestamps" },
  ),
);

export type UserOnlineCheckpointV1 = typeof UserOnlineCheckpointV1.Type;

/** Published only after the durable publisher has drained its pending checkpoints. */
const UserOnlineHealthV1 = Schema.Struct({
  version: Schema.Literal(1),
  type: Schema.Literal("collector"),
  observedAt: DateTimeWithOffsetString,
  status: Schema.Literals(["healthy", "degraded"]),
});

type UserOnlineHealthV1 = typeof UserOnlineHealthV1.Type;

export const UserOnlineEventV1 = Schema.Union([
  UserOnlineCheckpointV1,
  UserOnlineHealthV1,
]);

export type UserOnlineEventV1 = typeof UserOnlineEventV1.Type;

const canonicalRabbitEventSchemas = {
  [RabbitRoutingKey.GAME_CHARACTER_OFFLINE]: GameCharacterOffline,
  [RabbitRoutingKey.MARGONEM_ACCOUNT_VERIFIED_V1]: MargonemAccountVerifiedV1,
  [RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1]: GuildKillsAcceptedV1,
  [RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1]: UserOnlineEventV1,
  [RabbitRoutingKey.ACTIVITY_LOG_CREATE]: ActivityLogCreated,
  [RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED]: DiscordGuildChannelDeleted,
  [RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED]:
    DiscordGuildChannelUpserted,
  [RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED]:
    DiscordGuildChannelsSyncFailed,
  [RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNCED]: DiscordGuildChannelsSynced,
  [RabbitRoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED]:
    DiscordGuildSyncStateUpdated,
  [RabbitRoutingKey.EVENT_HERO_KILLED]: EventHeroKilled,
  [RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE]: EventMapStatusUpdated,
  [RabbitRoutingKey.EVENT_RANKING_UPDATE]: EventScope,
  [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: EventRespawnWindowChanged,
  [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: EventRespawnWindowChanged,
  [RabbitRoutingKey.CHARACTER_AURAS_CHANGED]: CharacterAurasChangedSchema,
  [RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE]: GlobalChatChannelUpdateSchema,
  [RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE]: GlobalChatMessageSchema,
  [RabbitRoutingKey.GUILDS_LOOTS_CREATE]: GuildLootCreatedMessageV2,
  [RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE]: GuildLootShareUpdatedEventV2,
  [RabbitRoutingKey.GUILDS_CREATE]: GuildCreated,
  [RabbitRoutingKey.GUILDS_DELETE]: GuildDeleted,
  [RabbitRoutingKey.GUILDS_UPDATE]: GuildUpdated,
  [RabbitRoutingKey.GUILDS_CREATE_ROLE]: GuildRoleChanged,
  [RabbitRoutingKey.GUILDS_DELETE_ROLE]: GuildRoleDeleted,
  [RabbitRoutingKey.GUILDS_UPDATE_ROLE]: GuildRoleChanged,
  [RabbitRoutingKey.GUILDS_MEMBERS_REMOVE]: GuildMemberChanged,
  [RabbitRoutingKey.GUILDS_MEMBERS_UPDATE]: GuildMemberChanged,
  [RabbitRoutingKey.GUILDS_HERO_SIGHTINGS_UPDATE]: GuildHeroSightingUpdated,
  [RabbitRoutingKey.GUILDS_TIMERS_UPDATE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_TIMERS_DELETE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_RESERVATIONS_CREATE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_RESERVATIONS_DELETE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_SEND_MESSAGE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_UPDATE_MESSAGE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_DELETE_MESSAGE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_CLEAR_MESSAGES]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER]: NotificationVolunteer,
  [RabbitRoutingKey.GUILDS_NOTIFICATIONS_GOING]: NotificationGoingUpdateSchema,
  [RabbitRoutingKey.GUILDS_PARTY_GATHERING]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED]:
    PartyGatheringUpdateEnvelopeSchema,
  [RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2]: ReservationChangedEventV2,
  [RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT]:
    DiscordNotificationDeliveryResultSchema,
  [RabbitRoutingKey.NOTIFICATIONS_DISCORD_SEND]:
    DiscordNotificationSendCommandSchema,
  [RabbitRoutingKey.NOTIFICATIONS_HERO_SIGHTING_UPDATED]:
    GuildHeroSightingUpdated,
  [RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED]:
    LootCreatedNotificationEventV2Schema,
  [RabbitRoutingKey.NOTIFICATIONS_LOOT_DRAW_RESOLVED]:
    LootDrawResolvedNotificationEventSchema,
  [RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED]: NotificationTimerDeleted,
  [RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED]: NotificationTimerUpdated,
  [RabbitRoutingKey.PRESENCE_CHECK_REQUEST]: PresenceCheckRequested,
  [RabbitRoutingKey.PRESENCE_COVERAGE_CHECK]: PresenceCoverageChecked,
  [RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED]: PartyReadyRoomUpdated,
  [RabbitRoutingKey.USERS_KILL_STATS_CHANGED]: UserKillStatsChanged,
  [RabbitRoutingKey.SEARCH_PLAYERS_INDEX]: Schema.Array(SearchPlayer),
  [RabbitRoutingKey.SEARCH_PLAYERS_REPLAY]: Schema.Array(SearchPlayer),
  [RabbitRoutingKey.CATALOG_ITEMS_INDEX]: Schema.Array(CatalogItemObservation),
  [RabbitRoutingKey.CATALOG_ITEMS_REPLAY]: Schema.Array(CatalogItemObservation),
  [RabbitRoutingKey.CATALOG_NPCS_INDEX]: Schema.Array(CatalogNpcObservation),
  [RabbitRoutingKey.CATALOG_NPCS_REPLAY]: Schema.Array(CatalogNpcObservation),
  [RabbitRoutingKey.CATALOG_ITEMS_RETIRED_DROPS]:
    Schema.Array(CatalogMonsterDrops),
  [RabbitRoutingKey.CATALOG_ITEMS_REVISIONS]:
    Schema.Array(CatalogItemRevisions),
  [RabbitRoutingKey.CATALOG_NPCS_LOCATIONS]: Schema.Array(
    CatalogMonsterLocations,
  ),
} as const;

/** The schema of each event, for consumers that decode with their own reader. */
export const rabbitEventSchema = <
  RoutingKey extends CanonicalRabbitEventRoutingKey,
>(
  routingKey: RoutingKey,
): (typeof canonicalRabbitEventSchemas)[RoutingKey] =>
  canonicalRabbitEventSchemas[routingKey];

export type CanonicalRabbitEventRoutingKey =
  keyof typeof canonicalRabbitEventSchemas;

export const isCanonicalRabbitEventRoutingKey = (
  routingKey: string,
): routingKey is CanonicalRabbitEventRoutingKey =>
  Object.prototype.hasOwnProperty.call(canonicalRabbitEventSchemas, routingKey);

export type CanonicalRabbitEvent<
  RoutingKey extends CanonicalRabbitEventRoutingKey,
> = (typeof canonicalRabbitEventSchemas)[RoutingKey]["Encoded"];

export const decodeRabbitEvent = <
  RoutingKey extends CanonicalRabbitEventRoutingKey,
>(
  routingKey: RoutingKey,
  input: unknown,
): CanonicalRabbitEvent<RoutingKey> => {
  const eventSchema = canonicalRabbitEventSchemas[routingKey];

  if (eventSchema === undefined) {
    throw new Error(`No RabbitMQ event schema for routing key: ${routingKey}`);
  }

  Schema.decodeUnknownSync(eventSchema)(input);

  // SAFETY: the routing key's schema just validated its encoded input. Return
  // that original input to preserve wire extension fields and object identity.
  return input as CanonicalRabbitEvent<RoutingKey>;
};

export const decodeRabbitEventJson = <
  RoutingKey extends CanonicalRabbitEventRoutingKey,
>(
  routingKey: RoutingKey,
  input: string,
): CanonicalRabbitEvent<RoutingKey> =>
  decodeRabbitEvent(
    routingKey,
    Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))(input),
  );
