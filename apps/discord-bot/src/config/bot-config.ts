import { Config, Context, Effect, Layer, type Redacted } from "effect";

export interface BotConfigValue {
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly discordBotToken: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly apiServiceUrl: string;
  readonly searchServiceUrl: string;
  readonly gatewayServiceUrl: string;
  readonly webAppUrl: string;
}

// Slash commands link players to the Web app of the cluster that answered.
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
      const environment = yield* Config.String("ENV").pipe(
        Config.withDefault("local"),
      );

      const value = yield* Config.all({
        port: Config.Int("PORT"),
        serviceName: Config.String("SERVICE_NAME").pipe(
          Config.withDefault("discord-bot"),
        ),
        serviceNamespace: Config.String("SERVICE_NAMESPACE").pipe(
          Config.withDefault("local"),
        ),
        discordBotToken: Config.Redacted("DISCORD_BOT_TOKEN"),
        rabbitmqUri: Config.Redacted("RABBITMQ_URI"),
        // Defaults are the in-cluster Service names, which slash commands
        // reach directly instead of through the public edge.
        apiServiceUrl: Config.String("API_SERVICE_URL").pipe(
          Config.withDefault("http://api:4000"),
        ),
        searchServiceUrl: Config.String("SEARCH_SERVICE_URL").pipe(
          Config.withDefault("http://search:4000"),
        ),
        gatewayServiceUrl: Config.String("GATEWAY_SERVICE_URL").pipe(
          Config.withDefault("http://gateway:4000"),
        ),
        webAppUrl: Config.String("WEB_APP_URL").pipe(
          Config.withDefault(
            WEB_APP_URL_BY_ENVIRONMENT.get(environment) ?? "http://localhost",
          ),
        ),
      });

      return BotConfig.of({ environment, ...value });
    }),
  );
}
