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
}

export enum NotificationJobKind {
  SCHEDULED = "SCHEDULED",
  INSTANT = "INSTANT",
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
  guildId?: string;
  world?: string;
  npcId?: number | null;
  npcIds?: number[];
  itemId?: number | null;
  itemIds?: number[];
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

export interface DiscordNotificationSendCommand {
  notificationJobId: string;
  provider: NotificationProvider.DISCORD;
  ownerType: NotificationOwnerType;
  ownerId: string;
  guildId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
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
