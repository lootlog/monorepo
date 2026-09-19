import { UserFeedItem } from "../feed.js";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";
import { DateTimeWithOffsetString } from "@lootlog/schema/http-scalars";
import {
  discordPermissionFields,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
import { NonNegativeInt } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import { RabbitRoutingKey } from "./topology.js";

export const GameCharacterOffline = Schema.Struct({
  userId: Schema.NonEmptyString,
  discordId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  characterId: Schema.NonEmptyString,
  organizationIds: Schema.Array(Schema.NonEmptyString),
  disconnectedAt: NonNegativeInt,
});

export type GameCharacterOffline = typeof GameCharacterOffline.Type;

const NullableString = Schema.NullOr(Schema.String);

const NullableNumber = Schema.NullOr(Schema.Number);

const GuildRole = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  color: Schema.Number,
  admin: Schema.Boolean,
  position: Schema.Number,
});

export const GuildCreated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  icon: NullableString,
  ownerId: Schema.NonEmptyString,
  roles: Schema.Array(GuildRole),
});

export const GuildUpdated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  icon: NullableString,
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

const DiscordGuildChannel = Schema.Struct({
  guildId: Schema.NonEmptyString,
  channelId: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  channelType: Schema.NonEmptyString,
  parentId: NullableString,
  position: Schema.Number,
  active: Schema.Boolean,
  canView: Schema.Boolean,
  canSend: Schema.Boolean,
  ...discordPermissionFields,
  lastSyncedAt: Schema.NonEmptyString,
});

const DiscordGuildSyncState = Schema.Struct({
  guildId: Schema.NonEmptyString,
  status: DiscordGuildSyncStatus,
  ...discordPermissionFields,
  channelCount: NonNegativeInt,
  selectableChannelCount: NonNegativeInt,
  lastAttemptAt: NullableString,
  lastSuccessAt: NullableString,
  lastError: NullableString,
  updatedAt: Schema.NonEmptyString,
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

const PartyReadyRoomUpdated = Schema.Struct({
  recipientDiscordId: Schema.NonEmptyString,
  eligibleGuildIds: Schema.Array(Schema.NonEmptyString),
  update: Schema.Unknown,
});

const NotificationVolunteer = Schema.Struct({
  notificationId: Schema.NonEmptyString,
  targetDiscordId: Schema.NonEmptyString,
  volunteerDiscordId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  character: Schema.Unknown,
});

export const GuildLootEventNpc = Schema.Struct({
  lvl: Schema.optional(NullableNumber),
  prof: Schema.optional(NullableString),
  type: Schema.optional(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
  wt: Schema.optional(
    Schema.NullOr(Schema.Union([Schema.Number, Schema.String])),
  ),
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

export const GuildLootCreatedEventV2 = Schema.Struct({
  feedEntry: Schema.optional(UserFeedItem),
  version: Schema.Literal(2),
  guildId: Schema.NonEmptyString,
  lootId: NonNegativeInt,
  npcs: Schema.Array(GuildLootEventNpc),
});

export type GuildLootCreatedEventV2 = typeof GuildLootCreatedEventV2.Type;

export const GuildLootShareUpdatedEventV2 = Schema.Struct({
  ...GuildLootCreatedEventV2.fields,
  lootShare: Schema.Record(Schema.String, Schema.Array(Schema.String)),
});

export type GuildLootShareUpdatedEventV2 =
  typeof GuildLootShareUpdatedEventV2.Type;

export const ReservationChangedEventV2 = Schema.Struct({
  version: Schema.Literal(2),
  action: Schema.Literals(["created", "updated", "deleted", "sharing-changed"]),
  sourceGuildId: Schema.NonEmptyString,
  audienceGuildIds: Schema.Array(Schema.NonEmptyString),
  reservationId: Schema.NullOr(NonNegativeInt),
  spotId: Schema.NullOr(Schema.String),
});

export type ReservationChangedEventV2 = typeof ReservationChangedEventV2.Type;

export const EventScope = Schema.Struct({
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
  heroId: Schema.optional(Schema.NonEmptyString),
});

const EventRespawnWindowChanged = Schema.Struct({
  ...EventScope.fields,
  heroNpcLvl: Schema.optional(Schema.NullOr(NonNegativeInt)),
  heroId: Schema.NonEmptyString,
});

const ActivityLogCreated = Schema.Struct({
  userId: Schema.NonEmptyString,
  guildId: Schema.optional(Schema.NonEmptyString),
  action: Schema.NonEmptyString,
  entityType: Schema.optional(Schema.NonEmptyString),
  entityId: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

const NotificationTimerUpdated = Schema.Struct({
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  npcId: NonNegativeInt,
  timerKey: Schema.NonEmptyString,
  minSpawnTime: Schema.NonEmptyString,
  maxSpawnTime: Schema.NonEmptyString,
  npc: Schema.optional(
    Schema.NullOr(Schema.Struct({ name: Schema.optional(Schema.String) })),
  ),
});

const NotificationTimerDeleted = Schema.Struct({
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  timerKey: Schema.NonEmptyString,
  npcId: Schema.optional(NonNegativeInt),
});

export const LootCreatedNotificationEventV2 = Schema.Struct({
  version: Schema.Literal(2),
  lootId: NonNegativeInt,
  world: Schema.NonEmptyString,
  guildIds: Schema.Array(Schema.NonEmptyString),
  itemIds: Schema.Array(NonNegativeInt),
  itemNames: Schema.Array(Schema.String),
  npcs: Schema.Array(
    Schema.Struct({
      type: NullableString,
      lvl: NullableNumber,
    }),
  ),
});

const DiscordNotificationDeliveryResult = Schema.Struct({
  notificationJobId: Schema.NonEmptyString,
  success: Schema.Boolean,
  retryable: Schema.Boolean,
  providerMessageId: Schema.optional(NullableString),
  errorCode: Schema.optional(NullableString),
  errorMessage: Schema.optional(NullableString),
  deliveredAt: Schema.NonEmptyString,
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
  [RabbitRoutingKey.GUILDS_LOOTS_CREATE]: GuildLootCreatedEventV2,
  [RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE]: GuildLootShareUpdatedEventV2,
  [RabbitRoutingKey.GUILDS_CREATE]: GuildCreated,
  [RabbitRoutingKey.GUILDS_DELETE]: GuildDeleted,
  [RabbitRoutingKey.GUILDS_UPDATE]: GuildUpdated,
  [RabbitRoutingKey.GUILDS_CREATE_ROLE]: GuildRoleChanged,
  [RabbitRoutingKey.GUILDS_DELETE_ROLE]: GuildRoleDeleted,
  [RabbitRoutingKey.GUILDS_UPDATE_ROLE]: GuildRoleChanged,
  [RabbitRoutingKey.GUILDS_MEMBERS_ADD]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_MEMBERS_ADD_ROLE]: GuildMemberChanged,
  [RabbitRoutingKey.GUILDS_MEMBERS_REMOVE]: GuildMemberChanged,
  [RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE]: GuildMemberChanged,
  [RabbitRoutingKey.GUILDS_MEMBERS_UPDATE]: GuildMemberChanged,
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
  [RabbitRoutingKey.GUILDS_PARTY_GATHERING]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_PARTY_GATHERING_CANCEL]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE]: OrganizationScopedEvent,
  [RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2]: ReservationChangedEventV2,
  [RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT]:
    DiscordNotificationDeliveryResult,
  [RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED]: LootCreatedNotificationEventV2,
  [RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED]: NotificationTimerDeleted,
  [RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED]: NotificationTimerUpdated,
  [RabbitRoutingKey.PRESENCE_CHECK_REQUEST]: PresenceCheckRequested,
  [RabbitRoutingKey.PRESENCE_COVERAGE_CHECK]: PresenceCoverageChecked,
  [RabbitRoutingKey.USERS_PARTY_READY_ROOM_UPDATED]: PartyReadyRoomUpdated,
} as const;

export type CanonicalRabbitEventRoutingKey =
  keyof typeof canonicalRabbitEventSchemas;

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
