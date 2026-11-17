import { Schema } from "effect";

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

export enum DiscordGuildSyncStatus {
  SYNCED = "SYNCED",
  SYNCING = "SYNCING",
  FAILED = "FAILED",
  STALE = "STALE",
  NOT_FOUND = "NOT_FOUND",
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

export interface LootCreatedNotificationEventV2 {
  version: 2;
  lootId: number;
  world: string;
  guildIds: ReadonlyArray<string>;
  itemIds: ReadonlyArray<number>;
  itemNames: ReadonlyArray<string>;
  npcs: ReadonlyArray<{
    type: string | null;
    lvl: number | null;
  }>;
}

export interface DiscordGuildChannelSnapshot {
  guildId: string;
  channelId: string;
  name: string;
  channelType: string;
  parentId: string | null;
  position: number;
  active: boolean;
  canView: boolean;
  canSend: boolean;
  hasRequiredPermissions: boolean;
  requiredPermissions: ReadonlyArray<string>;
  grantedPermissions: ReadonlyArray<string>;
  missingPermissions: ReadonlyArray<string>;
  lastSyncedAt: string;
}

export interface DiscordGuildSyncState {
  guildId: string;
  status: `${DiscordGuildSyncStatus}`;
  hasRequiredPermissions: boolean;
  requiredPermissions: ReadonlyArray<string>;
  grantedPermissions: ReadonlyArray<string>;
  missingPermissions: ReadonlyArray<string>;
  channelCount: number;
  selectableChannelCount: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface DiscordGuildChannelsSyncedEvent {
  guildId: string;
  channels: ReadonlyArray<DiscordGuildChannelSnapshot>;
  syncState: DiscordGuildSyncState;
}

export interface DiscordGuildChannelUpsertedEvent {
  guildId: string;
  channel: DiscordGuildChannelSnapshot;
  syncState: DiscordGuildSyncState;
}

export interface DiscordGuildChannelDeletedEvent {
  guildId: string;
  channelId: string;
  syncState: DiscordGuildSyncState;
}

export interface DiscordGuildChannelsSyncFailedEvent {
  guildId: string;
  status: `${DiscordGuildSyncStatus}`;
  lastAttemptAt: string;
  lastError: string;
}

export interface DiscordGuildSyncStateUpdatedEvent {
  guildId: string;
  syncState: DiscordGuildSyncState;
}

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
});

export type DiscordNotificationSendCommand =
  typeof DiscordNotificationSendCommandSchema.Type;

export interface DiscordNotificationDeliveryResultEvent {
  notificationJobId: string;
  success: boolean;
  retryable: boolean;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  deliveredAt: string;
}

export const NotificationTriggerTypeSchema = Schema.Literals(
  Object.values(NotificationTriggerType),
);

export const NotificationJobStatusSchema = Schema.Literals(
  Object.values(NotificationJobStatus),
);

export const DiscordGuildSyncStatusSchema = Schema.Literals([
  DiscordGuildSyncStatus.SYNCED,
  DiscordGuildSyncStatus.SYNCING,
  DiscordGuildSyncStatus.FAILED,
  DiscordGuildSyncStatus.STALE,
  DiscordGuildSyncStatus.NOT_FOUND,
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
