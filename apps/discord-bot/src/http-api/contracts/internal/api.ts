/** Endpoints owned by the internal HTTP module. */
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import {
  DiscordGuildChannels,
  DiscordGuildSyncState,
  GuildParams,
  InternalServerError,
} from "./schemas.js";

export class InternalGroup extends HttpApiGroup.make("internal")
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
