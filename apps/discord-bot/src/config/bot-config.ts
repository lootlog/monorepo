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
        environment: Config.string("ENV").pipe(Config.withDefault("local")),
        port: Config.int("PORT"),
        serviceName: Config.string("SERVICE_NAME").pipe(
          Config.withDefault("discord-bot"),
        ),
        serviceNamespace: Config.string("SERVICE_NAMESPACE").pipe(
          Config.withDefault("local"),
        ),
        discordBotToken: Config.redacted("DISCORD_BOT_TOKEN"),
        rabbitmqUri: Config.redacted("RABBITMQ_URI"),
      });
      return BotConfig.of(value);
    }),
  );
}
