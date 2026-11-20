import {
  type BaseServiceConfiguration,
  baseServiceConfig,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { Config, Context, Effect, Layer, Option, type Redacted } from "effect";
import type { R2Config } from "#src/config/r2.config";

const DEFAULT_SERVICE_NAME = "battlelog-service";

/**
 * The PostgreSQL client's settings. Migrations read only these, so they run
 * without the rest of the service configuration.
 */
export const battlelogDatabaseConfig = Config.all({
  url: Config.Redacted("POSTGRESQL_CONNECTION_URI"),
  applicationName: Config.String("SERVICE_NAME").pipe(
    Config.withDefault(DEFAULT_SERVICE_NAME),
  ),
});

export interface BattlelogConfiguration extends BaseServiceConfiguration {
  readonly cleanupSecret?: Redacted.Redacted<string> | undefined;
  readonly redisUrl: Redacted.Redacted<string>;
  readonly r2: R2Config;
}

const loadConfiguration = Effect.gen(function* () {
  const base = yield* baseServiceConfig(DEFAULT_SERVICE_NAME);

  return {
    ...base,
    cleanupSecret: yield* Config.option(
      Config.Redacted("BATTLELOG_CLEANUP_SECRET"),
    ).pipe(Config.map(Option.getOrUndefined)),
    redisUrl: yield* redisUrlConfig,
    r2: {
      accessKeyId: yield* Config.Redacted("R2_ACCESS_KEY_ID"),
      secretAccessKey: yield* Config.Redacted("R2_SECRET_ACCESS_KEY"),
      endpoint: yield* Config.String("R2_ENDPOINT"),
      region: yield* Config.String("R2_REGION").pipe(
        Config.withDefault("auto"),
      ),
      bucketName: yield* Config.String("R2_BUCKET_NAME"),
    },
  } satisfies BattlelogConfiguration;
});

export class BattlelogConfig extends Context.Service<
  BattlelogConfig,
  BattlelogConfiguration
>()("@lootlog/battlelog/Config") {
  static readonly layer = Layer.effect(BattlelogConfig, loadConfiguration);
}
