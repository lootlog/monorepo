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
}

export enum NotificationScheduleStrategy {
  SPAWN_WINDOW_RELATIVE = "SPAWN_WINDOW_RELATIVE",
  FIXED_DATETIME = "FIXED_DATETIME",
}

export enum NotificationScheduleAnchor {
  MIN_SPAWN = "MIN_SPAWN",
  MAX_SPAWN = "MAX_SPAWN",
}

export enum NotificationScheduleIntervalType {
  ONCE = "ONCE",
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
}

export enum NotificationJobKind {
  SCHEDULED = "SCHEDULED",
  INSTANT = "INSTANT",
  TEST = "TEST",
}

export enum NotificationJobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SENT = "SENT",
  FAILED = "FAILED",
  BLOCKED = "BLOCKED",
  CANCELED = "CANCELED",
}

export enum DiscordGuildSyncStatus {
  SYNCED = "SYNCED",
  SYNCING = "SYNCING",
  FAILED = "FAILED",
  STALE = "STALE",
  NOT_FOUND = "NOT_FOUND",
}

export interface NotificationFilters {
  guildIds?: string[];
  world?: string;
  npcId?: number | null;
  npcIds?: number[];
  itemId?: number | null;
  itemIds?: number[];
}

export interface LootCreatedNotificationEventV2 {
  version: 2;
  lootId: number;
  world: string;
  guildIds: string[];
  itemIds: number[];
  itemNames: string[];
  npcs: Array<{
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
  requiredPermissions: string[];
  grantedPermissions: string[];
  missingPermissions: string[];
  lastSyncedAt: string;
}

export interface DiscordGuildSyncState {
  guildId: string;
  status: DiscordGuildSyncStatus;
  hasRequiredPermissions: boolean;
  requiredPermissions: string[];
  grantedPermissions: string[];
  missingPermissions: string[];
  channelCount: number;
  selectableChannelCount: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface DiscordGuildChannelsSyncedEvent {
  guildId: string;
  channels: DiscordGuildChannelSnapshot[];
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
  status: DiscordGuildSyncStatus;
  lastAttemptAt: string;
  lastError: string;
}

export interface DiscordGuildSyncStateUpdatedEvent {
  guildId: string;
  syncState: DiscordGuildSyncState;
}

export interface DiscordNotificationSendTarget {
  targetId: string;
  externalId: string;
  targetType: NotificationTargetType;
}

export interface DiscordNotificationAllowedMentions {
  parse?: Array<"roles" | "users" | "everyone">;
  roles?: string[];
  users?: string[];
  repliedUser?: boolean;
}

export interface DiscordNotificationSendCommand {
  notificationJobId: string;
  provider: NotificationProvider.DISCORD;
  ownerType: NotificationOwnerType;
  ownerId: string;
  guildId?: string | null;
  content?: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  allowedMentions?: DiscordNotificationAllowedMentions;
  target: DiscordNotificationSendTarget;
}

export interface DiscordNotificationDeliveryResultEvent {
  notificationJobId: string;
  success: boolean;
  retryable: boolean;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  deliveredAt: string;
}

export const NotificationOwnerTypeSchema = Schema.Literals([
  NotificationOwnerType.GUILD,
  NotificationOwnerType.USER,
]);
export const NotificationProviderSchema = Schema.Literal(
  NotificationProvider.DISCORD,
);
export const NotificationTargetTypeSchema = Schema.Literals([
  NotificationTargetType.CHANNEL,
  NotificationTargetType.DM,
]);
export const NotificationTriggerTypeSchema = Schema.Literals([
  NotificationTriggerType.TIMER_BEFORE_SPAWN,
  NotificationTriggerType.NPC_SPAWNED,
  NotificationTriggerType.WATCHED_ITEM_DROPPED,
  NotificationTriggerType.SCHEDULED_MESSAGE,
]);
export const NotificationJobStatusSchema = Schema.Literals([
  NotificationJobStatus.PENDING,
  NotificationJobStatus.PROCESSING,
  NotificationJobStatus.SENT,
  NotificationJobStatus.FAILED,
  NotificationJobStatus.BLOCKED,
  NotificationJobStatus.CANCELED,
]);
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
