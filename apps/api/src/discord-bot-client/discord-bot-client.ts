import {
  type DiscordGuildChannelsResult,
  DiscordBotRpcGroup,
} from "@lootlog/rpc/discord-bot";
import type { RpcUpstream } from "@lootlog/rpc/callers";
import { makeRpcClient, type ServiceRpcClient } from "@lootlog/rpc/client";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";

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
  ) => Effect.Effect<DiscordGuildChannelsResult, DiscordBotClientFailure>;
}

type DiscordBotRpcClient = ServiceRpcClient<typeof DiscordBotRpcGroup>;

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
        RpcCallerRejectedError: () =>
          Effect.fail(
            new DiscordBotClientFailure({
              reason: "status",
              message: "Discord Bot rejected the API as caller",
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

export const makeDiscordBotRpcClient = (upstream: RpcUpstream) =>
  makeRpcClient(DiscordBotRpcGroup, {
    ...upstream,
    spanPrefix: "api.discord-bot-rpc",
  }).pipe(Effect.map(makeDiscordBotClient));
