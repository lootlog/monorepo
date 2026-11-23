import {
  baseServiceConfig,
  type BaseServiceConfiguration,
} from "@lootlog/instrumentation/service-config";
import { DEFAULT_RPC_PORT } from "@lootlog/rpc/server";
import { Config, Context, Effect, Layer, Redacted } from "effect";

export interface BotConfigValue extends BaseServiceConfiguration {
  readonly rpcPort: number;
  readonly discordBotToken: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly apiServiceUrl: string;
  readonly apiRpcUrl: string;
  readonly catalogRpcUrl: string;
  readonly gatewayRpcUrl: string;
  readonly webAppUrl: string;
}

const WEB_APP_URL_BY_ENVIRONMENT = new Map([
  ["prod", "https://lootlog.pl"],
  ["dev", "https://dev.lootlog.pl"],
]);

export class BotConfig extends Context.Service<BotConfig, BotConfigValue>()(
  "@lootlog/discord-bot/BotConfig",
) {
  static readonly layer = Layer.effect(
    BotConfig,
    Effect.gen(function* () {
      const base = yield* baseServiceConfig("discord-bot");
      const { environment } = base;

      const value = yield* Config.all({
        rpcPort: Config.Int("RPC_PORT").pipe(
          Config.withDefault(DEFAULT_RPC_PORT),
        ),
        discordBotToken: Config.Redacted("DISCORD_BOT_TOKEN"),
        rabbitmqUri: Config.Redacted("RABBITMQ_URI"),
        apiServiceUrl: Config.String("API_SERVICE_URL").pipe(
          Config.withDefault("http://api:4000"),
        ),
        apiRpcUrl: Config.String("API_RPC_URL").pipe(
          Config.withDefault("http://api:4001"),
        ),
        catalogRpcUrl: Config.String("CATALOG_RPC_URL").pipe(
          Config.withDefault("http://catalog:4001"),
        ),
        gatewayRpcUrl: Config.String("GATEWAY_RPC_URL").pipe(
          Config.withDefault("http://gateway:4001"),
        ),
        webAppUrl: Config.String("WEB_APP_URL").pipe(
          Config.withDefault(
            WEB_APP_URL_BY_ENVIRONMENT.get(environment) ?? "http://localhost",
          ),
        ),
      });

      return BotConfig.of({ ...base, ...value });
    }),
  );
}
