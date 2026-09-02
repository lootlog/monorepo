import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";

const GuildParams = Schema.Struct({ guildId: Schema.String });

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

const InternalServerError = Schema.Struct({
  message: Schema.Literal("Discord synchronization failed"),
}).pipe(HttpApiSchema.status(500));

class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("DiscordBotHealth", "/healthz", {
    success: Schema.Literal("OK").pipe(HttpApiSchema.asText()),
  }).annotate(OpenApi.Summary, "Health check"),
) {}

class InternalGroup extends HttpApiGroup.make("internal")
  .add(
    HttpApiEndpoint.get(
      "DiscordBotGetGuildChannels",
      "/internal/guilds/:guildId/channels",
      {
        params: GuildParams,
        success: DiscordGuildChannels,
        error: InternalServerError,
      },
    ),
  )
  .add(
    HttpApiEndpoint.post(
      "DiscordBotRefreshGuildChannels",
      "/internal/guilds/:guildId/channels/refresh",
      {
        params: GuildParams,
        success: DiscordGuildChannels,
        error: InternalServerError,
      },
    ),
  )
  .add(
    HttpApiEndpoint.get(
      "DiscordBotGetGuildSyncStatus",
      "/internal/guilds/:guildId/sync-status",
      {
        params: GuildParams,
        success: DiscordGuildSyncState,
        error: InternalServerError,
      },
    ),
  ) {}

export class DiscordBotApi extends HttpApi.make("DiscordBotApi")
  .annotate(OpenApi.Title, "Discord Bot API")
  .annotate(OpenApi.Version, "1.0")
  .add(HealthGroup, InternalGroup) {}
