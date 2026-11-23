import {
  baseServiceConfig,
  type BaseServiceConfiguration,
  webAppUrlConfig,
} from "@lootlog/instrumentation/service-config";
import {
  type CallerTokens,
  type RpcUpstream,
  rpcCallerTokensConfig,
  rpcUpstreamConfig,
} from "@lootlog/rpc/callers";
import { DiscordBotRpcGroup } from "@lootlog/rpc/discord-bot";
import { rpcPortConfig } from "@lootlog/rpc/server";
import { Config, Context, Effect, Layer, Redacted } from "effect";

export interface BotConfigValue extends BaseServiceConfiguration {
  readonly rpc: {
    readonly port: number;
    readonly callerTokens: CallerTokens;
    readonly api: RpcUpstream;
    readonly catalog: RpcUpstream;
    readonly gateway: RpcUpstream;
  };
  readonly discordBotToken: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly webAppUrl: string;
}

export class BotConfig extends Context.Service<BotConfig, BotConfigValue>()(
  "@lootlog/discord-bot/BotConfig",
) {
  static readonly layer = Layer.effect(
    BotConfig,
    Effect.gen(function* () {
      const base = yield* baseServiceConfig("discord-bot");

      const value = yield* Config.all({
        rpc: Config.all({
          port: rpcPortConfig,
          callerTokens: rpcCallerTokensConfig(
            "discord-bot",
            DiscordBotRpcGroup,
          ),
          api: rpcUpstreamConfig("discord-bot", "api"),
          catalog: rpcUpstreamConfig("discord-bot", "catalog"),
          gateway: rpcUpstreamConfig("discord-bot", "gateway"),
        }),
        discordBotToken: Config.Redacted("DISCORD_BOT_TOKEN"),
        rabbitmqUri: Config.Redacted("RABBITMQ_URI"),
        webAppUrl: webAppUrlConfig,
      });

      return BotConfig.of({ ...base, ...value });
    }),
  );
}
