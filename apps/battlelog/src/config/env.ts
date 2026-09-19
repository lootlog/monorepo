import { Config, Context, Effect, Layer, Option, Redacted } from "effect";
import type { R2Config } from "#src/config/r2.config";
import type { RedisOptions } from "#src/infrastructure/redis-store";

export interface BattlelogConfiguration {
  readonly cleanupSecret?: Redacted.Redacted<string>;
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly postgresqlConnectionUri: Redacted.Redacted<string>;
  readonly redis: Omit<RedisOptions, "password"> & {
    readonly password: Redacted.Redacted<string>;
  };
  readonly r2: R2Config;
}

const loadConfiguration = Effect.gen(function* () {
  const environment = yield* Config.String("ENV").pipe(
    Config.withDefault("local"),
  );

  const port = yield* Config.Port("PORT");

  const serviceName = yield* Config.String("SERVICE_NAME").pipe(
    Config.withDefault("battlelog-service"),
  );

  const serviceNamespace = yield* Config.String("SERVICE_NAMESPACE").pipe(
    Config.withDefault("local"),
  );

  const postgresqlConnectionUri = yield* Config.Redacted(
    "POSTGRESQL_CONNECTION_URI",
  );

  const redisHost = yield* Config.String("REDIS_HOST");
  const redisPort = yield* Config.Port("REDIS_PORT");
  const redisPassword = yield* Config.Redacted("REDIS_PASSWORD");
  const redisUsername = yield* Config.String("REDIS_USERNAME");
  const r2AccessKeyId = yield* Config.Redacted("R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = yield* Config.Redacted("R2_SECRET_ACCESS_KEY");
  const r2Endpoint = yield* Config.String("R2_ENDPOINT");

  const r2Region = yield* Config.String("R2_REGION").pipe(
    Config.withDefault("auto"),
  );

  const r2BucketName = yield* Config.String("R2_BUCKET_NAME");

  return {
    cleanupSecret: yield* Config.option(
      Config.Redacted("BATTLELOG_CLEANUP_SECRET"),
    ).pipe(Config.map(Option.getOrUndefined)),
    environment,
    port,
    postgresqlConnectionUri,
    serviceName,
    serviceNamespace,
    redis: {
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      username: redisUsername,
      prefix: serviceName,
    },
    r2: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      endpoint: r2Endpoint,
      region: r2Region,
      bucketName: r2BucketName,
    },
  } satisfies BattlelogConfiguration;
});

export class BattlelogConfig extends Context.Service<
  BattlelogConfig,
  BattlelogConfiguration
>()("@lootlog/battlelog/Config") {
  static readonly layer = Layer.effect(BattlelogConfig, loadConfiguration);
}
