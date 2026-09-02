import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type {
  DiscordGuildChannelSnapshot,
  DiscordGuildSyncState,
} from "@lootlog/schema/notifications";
import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { discordBotConfig } from "#src/config/discord-bot.config";
import {
  outboundHttpRequest,
  type OutboundHttpFailure,
} from "#src/shared/http/outbound-http";

type GuildChannels = {
  readonly channels: DiscordGuildChannelSnapshot[];
  readonly syncState: DiscordGuildSyncState;
};

export class DiscordBotClientFailure extends TaggedErrorClass<DiscordBotClientFailure>()(
  "DiscordBotClientFailure",
  {
    reason: Schema.Literals(["invalid-response", "status"]),
    message: Schema.String,
    status: Schema.optional(Schema.Number),
  },
) {}

type DiscordBotFailure = OutboundHttpFailure | DiscordBotClientFailure;

export interface DiscordBotClient {
  readonly getGuildChannels: (
    guildId: string,
  ) => Effect.Effect<GuildChannels, DiscordBotFailure>;
  readonly refreshGuildChannels: (
    guildId: string,
  ) => Effect.Effect<GuildChannels, DiscordBotFailure>;
  readonly getGuildSyncStatus: (
    guildId: string,
  ) => Effect.Effect<DiscordGuildSyncState, DiscordBotFailure>;
}

export const makeDiscordBotClient = (
  httpClient: HttpClientValue,
): DiscordBotClient => {
  const request = <A>(url: string, method: "GET" | "POST", timeout: number) =>
    outboundHttpRequest(httpClient, {
      adapter: "discord-bot",
      body: method === "POST" ? "{}" : undefined,
      headers: method === "POST" ? { "content-type": "application/json" } : {},
      method,
      responseLimitBytes: 1024 * 1024,
      retryTimes: method === "GET" ? 2 : 0,
      timeout: `${timeout} millis`,
      url,
    }).pipe(
      Effect.flatMap((response) =>
        response.status >= 200 && response.status < 300
          ? Effect.try({
              try: () =>
                JSON.parse(new TextDecoder().decode(response.body)) as A,
              catch: () =>
                new DiscordBotClientFailure({
                  reason: "invalid-response",
                  message: "Discord Bot returned invalid JSON",
                }),
            })
          : Effect.fail(
              new DiscordBotClientFailure({
                reason: "status",
                message: `Discord Bot request failed: ${response.status}`,
                status: response.status,
              }),
            ),
      ),
    );

  const serviceUrl = discordBotConfig.serviceUrl;
  return {
    getGuildChannels: (guildId) =>
      request<GuildChannels>(
        `${serviceUrl}/internal/guilds/${guildId}/channels`,
        "GET",
        5000,
      ),
    refreshGuildChannels: (guildId) =>
      request<GuildChannels>(
        `${serviceUrl}/internal/guilds/${guildId}/channels/refresh`,
        "POST",
        10_000,
      ),
    getGuildSyncStatus: (guildId) =>
      request<DiscordGuildSyncState>(
        `${serviceUrl}/internal/guilds/${guildId}/sync-status`,
        "GET",
        5000,
      ),
  };
};
