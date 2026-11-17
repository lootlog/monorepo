import { Schema } from "effect";

export enum NotificationOwnerType {
  GUILD = "GUILD",
  USER = "USER",
}

export enum NotificationProvider {
  DISCORD = "DISCORD",
}

export enum NotificationTargetType {
  CHANNEL = "CHANNEL",
  DM = "DM",
}

export enum NotificationTriggerType {
  TIMER_BEFORE_SPAWN = "TIMER_BEFORE_SPAWN",
  NPC_SPAWNED = "NPC_SPAWNED",
  WATCHED_ITEM_DROPPED = "WATCHED_ITEM_DROPPED",
  SCHEDULED_MESSAGE = "SCHEDULED_MESSAGE",
  HERO_SIGHTED = "HERO_SIGHTED",
}

export enum NotificationScheduleAnchor {
  MIN_SPAWN = "MIN_SPAWN",
  /** @public Persisted database enum value. */
  MAX_SPAWN = "MAX_SPAWN",
}

export enum NotificationJobKind {
  /** @public Persisted database enum value. */
  SCHEDULED = "SCHEDULED",
  /** @public Persisted database enum value. */
  INSTANT = "INSTANT",
  TEST = "TEST",
}

enum NotificationJobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SENT = "SENT",
  FAILED = "FAILED",
  BLOCKED = "BLOCKED",
  CANCELED = "CANCELED",
}

export const NotificationFiltersSchema = Schema.Struct({
  guildIds: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  world: Schema.optionalKey(Schema.String),
  npcId: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  npcIds: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.Number))),
  /** Margonem template ids; `npcId`/`npcIds` hold timer (runtime or legacy) ids. */
  npcTemplateIds: Schema.optionalKey(
    Schema.mutable(Schema.Array(Schema.Number)),
  ),
  itemId: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  itemIds: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.Number))),
  /** Level range of a hero sighting rule; omitted bounds are open. */
  npcLevelMin: Schema.optionalKey(Schema.Number),
  npcLevelMax: Schema.optionalKey(Schema.Number),
});

export type NotificationFilters = typeof NotificationFiltersSchema.Type;

export type DiscordNotificationAllowedMentions = {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: string[];
  users?: string[];
  repliedUser?: boolean;
};

export const NotificationOwnerTypeSchema = Schema.Literals([
  `${NotificationOwnerType.GUILD}`,
  `${NotificationOwnerType.USER}`,
]);

export const NotificationProviderSchema = Schema.Literal(
  `${NotificationProvider.DISCORD}`,
);

export const NotificationTargetTypeSchema = Schema.Literals([
  `${NotificationTargetType.CHANNEL}`,
  `${NotificationTargetType.DM}`,
]);

export const DiscordNotificationSendCommandSchema = Schema.Struct({
  notificationJobId: Schema.String,
  provider: NotificationProviderSchema,
  ownerType: NotificationOwnerTypeSchema,
  ownerId: Schema.String,
  guildId: Schema.optionalKey(Schema.NullOr(Schema.String)),
  content: Schema.optionalKey(Schema.String),
  title: Schema.String,
  message: Schema.String,
  metadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.Json)),
  allowedMentions: Schema.optionalKey(
    Schema.Struct({
      parse: Schema.optionalKey(
        Schema.mutable(
          Schema.Array(Schema.Literals(["roles", "users", "everyone"])),
        ),
      ),
      roles: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
      users: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
      repliedUser: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  target: Schema.Struct({
    targetId: Schema.String,
    externalId: Schema.String,
    targetType: NotificationTargetTypeSchema,
  }),
});

export type DiscordNotificationSendCommand =
  typeof DiscordNotificationSendCommandSchema.Type;

export const NotificationTriggerTypeSchema = Schema.Literals([
  `${NotificationTriggerType.TIMER_BEFORE_SPAWN}`,
  `${NotificationTriggerType.NPC_SPAWNED}`,
  `${NotificationTriggerType.WATCHED_ITEM_DROPPED}`,
  `${NotificationTriggerType.SCHEDULED_MESSAGE}`,
  `${NotificationTriggerType.HERO_SIGHTED}`,
]);

export const NotificationJobStatusSchema = Schema.Literals([
  `${NotificationJobStatus.PENDING}`,
  `${NotificationJobStatus.PROCESSING}`,
  `${NotificationJobStatus.SENT}`,
  `${NotificationJobStatus.FAILED}`,
  `${NotificationJobStatus.BLOCKED}`,
  `${NotificationJobStatus.CANCELED}`,
]);

export const LootCreatedNotificationEventV2Schema = Schema.Struct({
  version: Schema.Literal(2),
  lootId: Schema.Int,
  world: Schema.String,
  guildIds: Schema.Array(Schema.String),
  itemIds: Schema.Array(Schema.Int),
  itemNames: Schema.Array(Schema.String),
  npcs: Schema.Array(
    Schema.Struct({
      type: Schema.NullOr(Schema.String),
      lvl: Schema.NullOr(Schema.Number),
    }),
  ),
});

export type LootCreatedNotificationEventV2 =
  typeof LootCreatedNotificationEventV2Schema.Type;

/** The bot's answer to one notification send command. */
export const DiscordNotificationDeliveryResultSchema = Schema.Struct({
  notificationJobId: Schema.NonEmptyString,
  success: Schema.Boolean,
  retryable: Schema.Boolean,
  providerMessageId: Schema.optional(Schema.NullOr(Schema.String)),
  errorCode: Schema.optional(Schema.NullOr(Schema.String)),
  errorMessage: Schema.optional(Schema.NullOr(Schema.String)),
  deliveredAt: Schema.NonEmptyString,
});

export type DiscordNotificationDeliveryResult =
  typeof DiscordNotificationDeliveryResultSchema.Type;
