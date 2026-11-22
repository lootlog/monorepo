import {
  DiscordGuildChannel,
  DiscordGuildSyncState,
} from "@lootlog/schema/discord";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/http/HttpClient";
import {
  outboundHttpRequest,
  type OutboundHttpFailure,
} from "#src/shared/http/outbound-http";

const DiscordGuildChannelsResponse = Schema.Struct({
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
});

type GuildChannels = typeof DiscordGuildChannelsResponse.Type;

class DiscordBotClientFailure extends TaggedErrorClass<
  DiscordBotClientFailure,
  { readonly brand: unique symbol }
>()("DiscordBotClientFailure", {
  reason: Schema.Literals(["invalid-response", "status"]),
  message: Schema.String,
  status: Schema.optional(Schema.Finite),
}) {}

type DiscordBotFailure = OutboundHttpFailure | DiscordBotClientFailure;

export interface DiscordBotClient {
  readonly refreshGuildChannels: (
    guildId: string,
  ) => Effect.Effect<GuildChannels, DiscordBotFailure>;
}

export const makeDiscordBotClient = (
  httpClient: HttpClientValue,
  discordBotServiceUrl: URL,
): DiscordBotClient => {
  const request = <A>(
    decodeJson: (value: string) => A,
    url: string,
    timeout: number,
  ) =>
    outboundHttpRequest(httpClient, {
      adapter: "discord-bot",
      body: "{}",
      headers: { "content-type": "application/json" },
      method: "POST",
      responseLimitBytes: 1024 * 1024,
      retryTimes: 0,
      timeout: `${timeout} millis`,
      url,
    }).pipe(
      Effect.flatMap((response) =>
        response.status >= 200 && response.status < 300
          ? Effect.try({
              try: () => decodeJson(new TextDecoder().decode(response.body)),
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

  const serviceUrl = discordBotServiceUrl.toString().replace(/\/$/, "");

  return {
    refreshGuildChannels: (guildId) =>
      request(
        Schema.decodeUnknownSync(
          Schema.fromJsonString(DiscordGuildChannelsResponse),
        ),
        `${serviceUrl}/internal/guilds/${guildId}/channels/refresh`,
        10_000,
      ),
  };
};
