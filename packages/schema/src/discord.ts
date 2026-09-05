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

export const DiscordGuildSyncStatus = Schema.Literals([
  "SYNCED",
  "SYNCING",
  "FAILED",
  "STALE",
  "NOT_FOUND",
]);
