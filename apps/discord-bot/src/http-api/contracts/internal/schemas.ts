/** Transport schemas owned by the internal HTTP module. */
import { Schema } from "effect";
import { HttpApiSchema } from "effect/unstable/httpapi";

export const GuildParams = Schema.Struct({ guildId: Schema.String });

export const DiscordGuildChannel = Schema.Struct({
  guildId: Schema.String,
  channelId: Schema.String,
  name: Schema.String,
  channelType: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  position: Schema.Int,
  active: Schema.Boolean,
  canView: Schema.Boolean,
  canSend: Schema.Boolean,
  hasRequiredPermissions: Schema.Boolean,
  requiredPermissions: Schema.Array(Schema.String),
  grantedPermissions: Schema.Array(Schema.String),
  missingPermissions: Schema.Array(Schema.String),
  lastSyncedAt: Schema.String,
}).annotate({ identifier: "DiscordGuildChannel" });

export const DiscordGuildSyncState = Schema.Struct({
  guildId: Schema.String,
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
  channelCount: Schema.Int,
  selectableChannelCount: Schema.Int,
  lastAttemptAt: Schema.NullOr(Schema.String),
  lastSuccessAt: Schema.NullOr(Schema.String),
  lastError: Schema.NullOr(Schema.String),
  updatedAt: Schema.String,
}).annotate({ identifier: "DiscordGuildSyncState" });

export const DiscordGuildChannels = Schema.Struct({
  guildId: Schema.String,
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
}).annotate({ identifier: "DiscordGuildChannels" });

export const InternalServerError = Schema.Struct({
  message: Schema.Literal("Discord synchronization failed"),
}).pipe(HttpApiSchema.status(500));
