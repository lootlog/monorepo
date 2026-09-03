import { NonEmptyString, NonNegativeInt } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import { RabbitRoutingKey } from "./topology.js";

const NullableString = Schema.NullOr(Schema.String);
const NullableNumber = Schema.NullOr(Schema.Number);

const GuildRole = Schema.Struct({
  id: NonEmptyString,
  name: NonEmptyString,
  color: Schema.Number,
  admin: Schema.Boolean,
  position: Schema.Number,
});

export const GuildCreated = Schema.Struct({
  guildId: NonEmptyString,
  name: NonEmptyString,
  icon: Schema.String,
  ownerId: NonEmptyString,
  roles: Schema.Array(GuildRole),
});

export const GuildUpdated = Schema.Struct({
  guildId: NonEmptyString,
  name: NonEmptyString,
  icon: Schema.String,
  ownerId: NonEmptyString,
});

export const GuildDeleted = Schema.Struct({ guildId: NonEmptyString });
export type GuildCreated = typeof GuildCreated.Type;
export type GuildUpdated = typeof GuildUpdated.Type;
export type GuildDeleted = typeof GuildDeleted.Type;

export const GuildRoleChanged = Schema.Struct({
  guildId: NonEmptyString,
  ...GuildRole.fields,
});

export const GuildRoleDeleted = Schema.Struct({
  guildId: NonEmptyString,
  id: NonEmptyString,
});
export type GuildRoleChanged = typeof GuildRoleChanged.Type;
export type GuildRoleDeleted = typeof GuildRoleDeleted.Type;

export const GuildMemberChanged = Schema.Struct({
  guildId: NonEmptyString,
  discordId: NonEmptyString,
  userId: NonEmptyString,
});

export const PresenceCheckRequested = Schema.Struct({
  guildId: NonEmptyString,
  mapName: NonEmptyString,
});

export const PresenceCoverageChecked = Schema.Struct({
  guildId: NonEmptyString,
  mapName: NonEmptyString,
  discordId: NonEmptyString,
  hasPlayer: Schema.Boolean,
  isAfk: Schema.optional(Schema.Boolean),
});

const DiscordGuildChannel = Schema.Struct({
  guildId: NonEmptyString,
  channelId: NonEmptyString,
  name: NonEmptyString,
  channelType: NonEmptyString,
  parentId: NullableString,
  position: Schema.Number,
  active: Schema.Boolean,
  canView: Schema.Boolean,
  canSend: Schema.Boolean,
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
  lastSyncedAt: NonEmptyString,
});

const DiscordGuildSyncState = Schema.Struct({
  guildId: NonEmptyString,
  status: Schema.Literals([
    "SYNCED",
    "SYNCING",
    "FAILED",
    "STALE",
    "NOT_FOUND",
  ]),
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
  channelCount: NonNegativeInt,
  selectableChannelCount: NonNegativeInt,
  lastAttemptAt: NullableString,
  lastSuccessAt: NullableString,
  lastError: NullableString,
  updatedAt: NonEmptyString,
});

export const DiscordGuildChannelsSynced = Schema.Struct({
  guildId: NonEmptyString,
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
});

export const DiscordGuildChannelUpserted = Schema.Struct({
  guildId: NonEmptyString,
  channel: DiscordGuildChannel,
  syncState: DiscordGuildSyncState,
});

export const DiscordGuildChannelsSyncFailed = Schema.Struct({
  guildId: NonEmptyString,
  status: Schema.Literals([
    "SYNCED",
    "SYNCING",
    "FAILED",
    "STALE",
    "NOT_FOUND",
  ]),
  lastAttemptAt: NonEmptyString,
  lastError: NonEmptyString,
});

export const DiscordGuildSyncStateUpdated = Schema.Struct({
  guildId: NonEmptyString,
  syncState: DiscordGuildSyncState,
});

export const OrganizationScopedEvent = Schema.Union([
  Schema.Struct({ guildId: NonEmptyString }),
  Schema.Struct({ organizationId: NonEmptyString }),
]);

export const PartyReadyRoomUpdated = Schema.Struct({
  recipientDiscordId: NonEmptyString,
  eligibleGuildIds: Schema.Array(NonEmptyString),
  update: Schema.Unknown,
});

export const NotificationVolunteer = Schema.Struct({
  notificationId: NonEmptyString,
  targetDiscordId: NonEmptyString,
  volunteerDiscordId: NonEmptyString,
  world: NonEmptyString,
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

export const GuildLootCreatedEventV2 = Schema.Struct({
  version: Schema.Literal(2),
  guildId: NonEmptyString,
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
  sourceGuildId: NonEmptyString,
  audienceGuildIds: Schema.Array(NonEmptyString),
  reservationId: Schema.NullOr(NonNegativeInt),
  spotId: Schema.NullOr(Schema.String),
});
export type ReservationChangedEventV2 = typeof ReservationChangedEventV2.Type;

export const EventScope = Schema.Struct({
  guildId: NonEmptyString,
  eventId: NonEmptyString,
});

export const EventMapStatusUpdated = Schema.Struct({
  ...EventScope.fields,
  mapId: NonEmptyString,
  reason: Schema.optional(Schema.String),
});

export const EventHeroKilled = Schema.Struct({
  ...EventScope.fields,
  heroId: Schema.optional(NonEmptyString),
});

export const EventRespawnWindowChanged = Schema.Struct({
  ...EventScope.fields,
  heroId: NonEmptyString,
});

export const ActivityLogCreated = Schema.Struct({
  userId: NonEmptyString,
  guildId: Schema.optional(NonEmptyString),
  action: NonEmptyString,
  entityType: Schema.optional(NonEmptyString),
  entityId: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

export const NotificationTimerUpdated = Schema.Struct({
  guildId: NonEmptyString,
  world: NonEmptyString,
  npcId: NonNegativeInt,
  timerKey: NonEmptyString,
  minSpawnTime: NonEmptyString,
  maxSpawnTime: NonEmptyString,
  npc: Schema.optional(
    Schema.NullOr(Schema.Struct({ name: Schema.optional(Schema.String) })),
  ),
});

export const NotificationTimerDeleted = Schema.Struct({
  guildId: NonEmptyString,
  world: NonEmptyString,
  timerKey: NonEmptyString,
  npcId: Schema.optional(NonNegativeInt),
});

export const LootCreatedNotificationEventV2 = Schema.Struct({
  version: Schema.Literal(2),
  lootId: NonNegativeInt,
  world: NonEmptyString,
  guildIds: Schema.Array(NonEmptyString),
  itemIds: Schema.Array(NonNegativeInt),
  itemNames: Schema.Array(Schema.String),
  npcs: Schema.Array(
    Schema.Struct({
      type: NullableString,
      lvl: NullableNumber,
    }),
  ),
});

export const DiscordNotificationDeliveryResult = Schema.Struct({
  notificationJobId: NonEmptyString,
  success: Schema.Boolean,
  retryable: Schema.Boolean,
  providerMessageId: Schema.optional(NullableString),
  errorCode: Schema.optional(NullableString),
  errorMessage: Schema.optional(NullableString),
  deliveredAt: NonEmptyString,
});

export const DiscordGuildChannelDeleted = Schema.Struct({
  guildId: NonEmptyString,
  channelId: NonEmptyString,
  syncState: Schema.Record(Schema.String, Schema.Unknown),
});

export const canonicalRabbitEventSchemas = {
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

export const decodeRabbitEvent = <
  RoutingKey extends CanonicalRabbitEventRoutingKey,
>(
  routingKey: RoutingKey,
  input: unknown,
): unknown => {
  const eventSchema = canonicalRabbitEventSchemas[routingKey];
  if (eventSchema === undefined) {
    throw new Error(`No RabbitMQ event schema for routing key: ${routingKey}`);
  }
  Schema.decodeUnknownSync(eventSchema)(input);
  return input;
};

export const decodeRabbitEventJson = <
  RoutingKey extends CanonicalRabbitEventRoutingKey,
>(
  routingKey: RoutingKey,
  input: string,
): unknown =>
  decodeRabbitEvent(
    routingKey,
    Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))(input),
  );
