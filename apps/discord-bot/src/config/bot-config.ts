import { Config, Context, Effect, Layer } from "effect";

export interface BotConfigValue {
  readonly port: number;
  readonly serviceName: string;
  readonly discordBotToken: string;
  readonly rabbitmqUri: string;
}
export class BotConfig extends Context.Service<BotConfig, BotConfigValue>()(
  "@lootlog/discord-bot/BotConfig",
) {
  static readonly layer = Layer.effect(
    BotConfig,
    Effect.gen(function* () {
      const value = yield* Config.all({
        port: Config.int("PORT"),
        serviceName: Config.string("SERVICE_NAME").pipe(
          Config.withDefault("discord-bot"),
        ),
        discordBotToken: Config.string("DISCORD_BOT_TOKEN"),
        rabbitmqUri: Config.string("RABBITMQ_URI"),
      });
      return BotConfig.of(value);
    }),
  );
}
