import { NonEmptyString, NonNegativeInt } from "@lootlog/schema/primitives";
import { Schema } from "effect";
import { RabbitRoutingKey } from "./topology.js";

const NullableString = Schema.NullOr(Schema.String);
const NullableNumber = Schema.NullOr(Schema.Number);

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
  [RabbitRoutingKey.EVENT_HERO_KILLED]: EventHeroKilled,
  [RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE]: EventMapStatusUpdated,
  [RabbitRoutingKey.EVENT_RANKING_UPDATE]: EventScope,
  [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED]: EventRespawnWindowChanged,
  [RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED]: EventRespawnWindowChanged,
  [RabbitRoutingKey.GUILDS_LOOTS_CREATE]: GuildLootCreatedEventV2,
  [RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE]: GuildLootShareUpdatedEventV2,
  [RabbitRoutingKey.GUILDS_RESERVATIONS_CHANGED_V2]: ReservationChangedEventV2,
  [RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT]:
    DiscordNotificationDeliveryResult,
  [RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED]: LootCreatedNotificationEventV2,
  [RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED]: NotificationTimerDeleted,
  [RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED]: NotificationTimerUpdated,
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
  return Schema.decodeUnknownSync(eventSchema)(input);
};
