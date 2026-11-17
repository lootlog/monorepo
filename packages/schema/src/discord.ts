import { Schema } from "effect";

export const DISCORD_AUTH_SCOPES = [
  "guilds.members.read",
  "guilds",
  "identify",
  "email",
];

export const DISCORD_ADMINISTRATOR_PERMISSION = 0x8n;

export const discordPermissionFields = {
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
};

export const discordGuildChannelFields = {
  guildId: Schema.String,
  channelId: Schema.String,
  name: Schema.String,
  channelType: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  position: Schema.Int,
  active: Schema.Boolean,
  canView: Schema.Boolean,
  canSend: Schema.Boolean,
  ...discordPermissionFields,
};

export const DiscordGuildSyncStatus = Schema.Literals([
  "SYNCED",
  "SYNCING",
  "FAILED",
  "STALE",
  "NOT_FOUND",
]);

export type DiscordGuildSyncStatus = typeof DiscordGuildSyncStatus.Type;

/** A Discord channel as the bot last saw it; the API keeps it as a snapshot. */
export const DiscordGuildChannel = Schema.Struct({
  ...discordGuildChannelFields,
  lastSyncedAt: Schema.String,
}).annotate({ identifier: "DiscordGuildChannel" });

export type DiscordGuildChannel = typeof DiscordGuildChannel.Type;

export const DiscordGuildSyncState = Schema.Struct({
  guildId: Schema.String,
  status: DiscordGuildSyncStatus,
  ...discordPermissionFields,
  channelCount: Schema.Int,
  selectableChannelCount: Schema.Int,
  lastAttemptAt: Schema.NullOr(Schema.String),
  lastSuccessAt: Schema.NullOr(Schema.String),
  lastError: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
}).annotate({ identifier: "DiscordGuildSyncState" });

export type DiscordGuildSyncState = typeof DiscordGuildSyncState.Type;
