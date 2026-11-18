import {
  DiscordGuildChannel,
  DiscordGuildSyncState,
} from "@lootlog/schema/discord";
/** Transport schemas owned by the internal HTTP module. */
import { Schema } from "effect";
import { HttpApiSchema } from "effect/http-api";

export const GuildParams = Schema.Struct({ guildId: Schema.String });

export const DiscordGuildChannels = Schema.Struct({
  guildId: Schema.String,
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
}).annotate({ identifier: "DiscordGuildChannels" });

export const InternalServerError = Schema.Struct({
  message: Schema.Literal("Discord synchronization failed"),
}).pipe(HttpApiSchema.status(500));
