import { Config, Context, Effect, Layer, Redacted } from "effect";
import type { R2Config } from "#src/config/r2.config";
import type { RedisOptions } from "#src/shared/modules/redis/redis.service";

export interface BattlelogConfiguration {
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
  const environment = yield* Config.string("ENV").pipe(
    Config.withDefault("local"),
  );
  const port = yield* Config.port("PORT");
  const serviceName = yield* Config.string("SERVICE_NAME").pipe(
    Config.withDefault("battlelog-service"),
  );
  const serviceNamespace = yield* Config.string("SERVICE_NAMESPACE").pipe(
    Config.withDefault("local"),
  );
  const postgresqlConnectionUri = yield* Config.redacted(
    "POSTGRESQL_CONNECTION_URI",
  );
  const redisHost = yield* Config.string("REDIS_HOST");
  const redisPort = yield* Config.port("REDIS_PORT");
  const redisPassword = yield* Config.redacted("REDIS_PASSWORD");
  const redisUsername = yield* Config.string("REDIS_USERNAME");
  const r2AccessKeyId = yield* Config.redacted("R2_ACCESS_KEY_ID");
  const r2SecretAccessKey = yield* Config.redacted("R2_SECRET_ACCESS_KEY");
  const r2Endpoint = yield* Config.string("R2_ENDPOINT");
  const r2Region = yield* Config.string("R2_REGION").pipe(
    Config.withDefault("auto"),
  );
  const r2BucketName = yield* Config.string("R2_BUCKET_NAME");

  return {
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
