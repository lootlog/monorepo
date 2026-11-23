import {
  DiscordGuildChannel,
  DiscordGuildSyncState,
} from "@lootlog/schema/discord";
import { DiscordBotRpcGroup } from "@lootlog/rpc/discord-bot";
import { makeRpcClient } from "@lootlog/rpc/client";
import type { RpcUnavailableError } from "@lootlog/rpc/errors";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";
import type { RpcClientError } from "effect/rpc";

const DiscordGuildChannelsResponse = Schema.Struct({
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
});

type GuildChannels = typeof DiscordGuildChannelsResponse.Type;

class DiscordBotClientFailure extends TaggedErrorClass<
  DiscordBotClientFailure,
  { readonly brand: unique symbol }
>()("DiscordBotClientFailure", {
  reason: Schema.Literals(["status", "timeout", "transport"]),
  message: Schema.String,
}) {}

export interface DiscordBotClient {
  readonly refreshGuildChannels: (
    guildId: string,
  ) => Effect.Effect<GuildChannels, DiscordBotClientFailure>;
}

interface DiscordBotRpcClient {
  readonly refreshGuildChannels: (input: {
    readonly guildId: string;
  }) => Effect.Effect<
    GuildChannels,
    RpcUnavailableError | RpcClientError.RpcClientError
  >;
}

export const makeDiscordBotClient = (
  rpc: DiscordBotRpcClient,
): DiscordBotClient => ({
  refreshGuildChannels: (guildId) =>
    rpc.refreshGuildChannels({ guildId }).pipe(
      Effect.timeout("10 seconds"),
      Effect.catchTags({
        TimeoutError: () =>
          Effect.fail(
            new DiscordBotClientFailure({
              reason: "timeout",
              message: "Discord Bot request timed out",
            }),
          ),
        RpcUnavailableError: (error) =>
          Effect.fail(
            new DiscordBotClientFailure({
              reason: "status",
              message: error.message ?? "Discord Bot synchronization failed",
            }),
          ),
        RpcClientError: () =>
          Effect.fail(
            new DiscordBotClientFailure({
              reason: "transport",
              message: "Discord Bot RPC request failed",
            }),
          ),
      }),
    ),
});

export const makeDiscordBotRpcClient = (discordBotRpcUrl: URL) =>
  makeRpcClient(DiscordBotRpcGroup, {
    url: discordBotRpcUrl,
    spanPrefix: "api.discord-bot-rpc",
  }).pipe(Effect.map(makeDiscordBotClient));
