import { Schema } from "effect";
import { ProfessionSchema } from "./loot.js";

export const NotificationOwnerType = { GUILD: "GUILD", USER: "USER" } as const;

export type NotificationOwnerType =
  (typeof NotificationOwnerType)[keyof typeof NotificationOwnerType];

export const NotificationProvider = { DISCORD: "DISCORD" } as const;

export type NotificationProvider =
  (typeof NotificationProvider)[keyof typeof NotificationProvider];

export const NotificationTargetType = { CHANNEL: "CHANNEL", DM: "DM" } as const;

export type NotificationTargetType =
  (typeof NotificationTargetType)[keyof typeof NotificationTargetType];

export const NotificationTriggerType = {
  TIMER_BEFORE_SPAWN: "TIMER_BEFORE_SPAWN",
  NPC_SPAWNED: "NPC_SPAWNED",
  WATCHED_ITEM_DROPPED: "WATCHED_ITEM_DROPPED",
  SCHEDULED_MESSAGE: "SCHEDULED_MESSAGE",
  HERO_SIGHTED: "HERO_SIGHTED",
  LOOT_DRAW_RESOLVED: "LOOT_DRAW_RESOLVED",
} as const;

export type NotificationTriggerType =
  (typeof NotificationTriggerType)[keyof typeof NotificationTriggerType];

export const NotificationScheduleStrategy = {
  SPAWN_WINDOW_RELATIVE: "SPAWN_WINDOW_RELATIVE",
  FIXED_DATETIME: "FIXED_DATETIME",
} as const;

export type NotificationScheduleStrategy =
  (typeof NotificationScheduleStrategy)[keyof typeof NotificationScheduleStrategy];

export const NotificationScheduleAnchor = {
  MIN_SPAWN: "MIN_SPAWN",
  MAX_SPAWN: "MAX_SPAWN",
} as const;

export type NotificationScheduleAnchor =
  (typeof NotificationScheduleAnchor)[keyof typeof NotificationScheduleAnchor];

export const NotificationScheduleIntervalType = {
  ONCE: "ONCE",
  HOURLY: "HOURLY",
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;

export type NotificationScheduleIntervalType =
  (typeof NotificationScheduleIntervalType)[keyof typeof NotificationScheduleIntervalType];

export const NotificationJobKind = {
  SCHEDULED: "SCHEDULED",
  INSTANT: "INSTANT",
  TEST: "TEST",
} as const;

export type NotificationJobKind =
  (typeof NotificationJobKind)[keyof typeof NotificationJobKind];

export const NotificationJobStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SENT: "SENT",
  FAILED: "FAILED",
  BLOCKED: "BLOCKED",
  CANCELED: "CANCELED",
} as const;

export type NotificationJobStatus =
  (typeof NotificationJobStatus)[keyof typeof NotificationJobStatus];

export const NotificationFiltersSchema = Schema.Struct({
  guildIds: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
  world: Schema.optionalKey(Schema.String),
  npcId: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  npcIds: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.Finite))),
  npcTemplateIds: Schema.optionalKey(
    Schema.mutable(Schema.Array(Schema.Finite)),
  ),
  itemId: Schema.optionalKey(Schema.NullOr(Schema.Finite)),
  itemIds: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.Finite))),
  npcLevelMin: Schema.optionalKey(Schema.Finite),
  npcLevelMax: Schema.optionalKey(Schema.Finite),
});

export type NotificationFilters = typeof NotificationFiltersSchema.Type;

export type DiscordNotificationAllowedMentions = {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: string[];
  users?: string[];
  repliedUser?: boolean;
};

export const NotificationOwnerTypeSchema = Schema.Literals(
  Object.values(NotificationOwnerType),
);

export const NotificationProviderSchema = Schema.Literal(
  NotificationProvider.DISCORD,
);

export const NotificationTargetTypeSchema = Schema.Literals(
  Object.values(NotificationTargetType),
);

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
  files: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        name: Schema.String,
        contentType: Schema.Literal("image/png"),
        base64: Schema.String,
      }),
    ),
  ),
});

export type DiscordNotificationSendCommand =
  typeof DiscordNotificationSendCommandSchema.Type;

export const NotificationTriggerTypeSchema = Schema.Literals(
  Object.values(NotificationTriggerType),
);

export const NotificationJobStatusSchema = Schema.Literals(
  Object.values(NotificationJobStatus),
);

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
      lvl: Schema.NullOr(Schema.Finite),
    }),
  ),
});

export type LootCreatedNotificationEventV2 =
  typeof LootCreatedNotificationEventV2Schema.Type;

export const LootDrawOutcome = { DRAWN: "DRAWN", VOIDED: "VOIDED" } as const;

export type LootDrawOutcome =
  (typeof LootDrawOutcome)[keyof typeof LootDrawOutcome];

export const LootDrawResolvedNotificationEventSchema = Schema.Struct({
  guildId: Schema.NonEmptyString,
  world: Schema.NonEmptyString,
  lootId: Schema.Int,
  outcome: Schema.Literals(Object.values(LootDrawOutcome)),
  item: Schema.Struct({
    hid: Schema.String,
    name: Schema.String,
    icon: Schema.String,
    lvl: Schema.Finite,
  }),
  npcName: Schema.NullOr(Schema.String),
  draw: Schema.Struct({
    id: Schema.Int,
    entrants: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        prof: Schema.NullOr(ProfessionSchema),
        lvl: Schema.NullOr(Schema.Finite),
        tickets: Schema.Int,
      }),
    ),
    winnerIndex: Schema.Int,
    drawnBy: Schema.String,
    voided: Schema.NullOr(
      Schema.Struct({ by: Schema.String, reason: Schema.String }),
    ),
  }),
});

export type LootDrawResolvedNotificationEvent =
  typeof LootDrawResolvedNotificationEventSchema.Type;

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
