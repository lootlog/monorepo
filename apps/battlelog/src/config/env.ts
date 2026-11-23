import {
  type BaseServiceConfiguration,
  baseServiceConfig,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { Config, Context, Effect, Layer, type Redacted } from "effect";

const DEFAULT_SERVICE_NAME = "battlelog-service";

export const battlelogDatabaseConfig = Config.all({
  url: Config.Redacted("POSTGRESQL_CONNECTION_URI"),
  applicationName: Config.String("SERVICE_NAME").pipe(
    Config.withDefault(DEFAULT_SERVICE_NAME),
  ),
});

export interface BattlelogConfiguration extends BaseServiceConfiguration {
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redisUrl: Redacted.Redacted<string>;
}

const loadConfiguration = Effect.gen(function* () {
  const base = yield* baseServiceConfig(DEFAULT_SERVICE_NAME);

  return {
    ...base,
    rabbitmqUri: yield* Config.Redacted("RABBITMQ_URI"),
    redisUrl: yield* redisUrlConfig,
  } satisfies BattlelogConfiguration;
});

export class BattlelogConfig extends Context.Service<
  BattlelogConfig,
  BattlelogConfiguration
>()("@lootlog/battlelog/Config") {
  static readonly layer = Layer.effect(BattlelogConfig, loadConfiguration);
}
