import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import {
  DiscordGuildChannels,
  GuildParams,
  InternalServerError,
} from "./schemas.js";

export class InternalGroup extends HttpApiGroup.make("internal").add(
  HttpApiEndpoint.post(
    "DiscordBotRefreshGuildChannels",
    "/internal/guilds/:guildId/channels/refresh",
    {
      params: GuildParams,
      success: DiscordGuildChannels,
      error: InternalServerError,
    },
  ),
) {}
