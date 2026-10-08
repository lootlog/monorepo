import {
  discordGuildChannelFields,
  discordPermissionFields,
  DiscordGuildSyncStatus,
} from "@lootlog/schema/discord";
/** Transport schemas owned by the internal HTTP module. */
import { Schema } from "effect";
import { HttpApiSchema } from "effect/http-api";

export const GuildParams = Schema.Struct({ guildId: Schema.String });

export const DiscordGuildChannel = Schema.Struct({
  ...discordGuildChannelFields,
  lastSyncedAt: Schema.String,
}).annotate({ identifier: "DiscordGuildChannel" });

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

export const DiscordGuildChannels = Schema.Struct({
  guildId: Schema.String,
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
}).annotate({ identifier: "DiscordGuildChannels" });

export const InternalServerError = Schema.Struct({
  message: Schema.Literal("Discord synchronization failed"),
}).pipe(HttpApiSchema.status(500));
