import { Config, Context, Effect, Layer, type Redacted } from "effect";

export interface BotConfigValue {
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly discordBotToken: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
}

export class BotConfig extends Context.Service<BotConfig, BotConfigValue>()(
  "@lootlog/discord-bot/BotConfig",
) {
  static readonly layer = Layer.effect(
    BotConfig,
    Effect.gen(function* () {
      const value = yield* Config.all({
        environment: Config.String("ENV").pipe(Config.withDefault("local")),
        port: Config.Int("PORT"),
        serviceName: Config.String("SERVICE_NAME").pipe(
          Config.withDefault("discord-bot"),
        ),
        serviceNamespace: Config.String("SERVICE_NAMESPACE").pipe(
          Config.withDefault("local"),
        ),
        discordBotToken: Config.Redacted("DISCORD_BOT_TOKEN"),
        rabbitmqUri: Config.Redacted("RABBITMQ_URI"),
      });

      return BotConfig.of(value);
    }),
  );
}
