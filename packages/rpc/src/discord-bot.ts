import {
  DiscordGuildChannel,
  DiscordGuildSyncState,
} from "@lootlog/schema/discord";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";
import { CallerAuth, RpcCallers } from "./callers.js";
import { RpcUnavailableError } from "./errors.js";

export const DiscordGuildChannelsResult = Schema.Struct({
  guildId: Schema.String,
  channels: Schema.Array(DiscordGuildChannel),
  syncState: DiscordGuildSyncState,
});

export type DiscordGuildChannelsResult = typeof DiscordGuildChannelsResult.Type;

export class DiscordBotRpcGroup extends RpcGroup.make(
  Rpc.make("refreshGuildChannels", {
    payload: {
      guildId: Schema.String,
    },
    success: DiscordGuildChannelsResult,
    error: RpcUnavailableError,
  }).annotate(RpcCallers, ["api"]),
).middleware(CallerAuth) {}
