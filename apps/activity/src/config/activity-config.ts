import {
  RuntimeEnvironment,
  RuntimeEnvironmentSchema,
} from "@lootlog/schema/runtime-environment";
import { Config, Context, Effect, Layer } from "effect";

export interface ActivityConfigValue {
  readonly environment: RuntimeEnvironment;
  readonly port: number;
  readonly serviceName: string;
  readonly databaseUrl: string;
  readonly rabbitmqUri: string;
  readonly redisUrl?: string;
  readonly apiServiceUrl: string;
  readonly signatureSecret: string;
}

export class ActivityConfig extends Context.Service<
  ActivityConfig,
  ActivityConfigValue
>()("@lootlog/activity/ActivityConfig") {
  static readonly layer = Layer.effect(
    ActivityConfig,
    Effect.gen(function* () {
      const environment = yield* Config.schema(
        RuntimeEnvironmentSchema,
        "ENV",
      ).pipe(Config.withDefault(RuntimeEnvironment.LOCAL));
      const configuredSecret = yield* Config.option(
        Config.string("ACTIVITY_EVENT_SIGNATURE_SECRET"),
      );
      const signatureSecret =
        configuredSecret._tag === "Some"
          ? configuredSecret.value
          : environment === RuntimeEnvironment.PROD ||
              environment === RuntimeEnvironment.STAGING
            ? yield* Effect.die(
                new Error(
                  `ACTIVITY_EVENT_SIGNATURE_SECRET is required when ENV=${environment}`,
                ),
              )
            : "local-development-activity-event-signature-secret";
      if (signatureSecret.length < 32)
        return yield* Effect.die(
          new Error(
            "ACTIVITY_EVENT_SIGNATURE_SECRET must contain at least 32 characters",
          ),
        );
      const redisHost = yield* Config.option(Config.string("REDIS_HOST"));
      const redisPort = yield* Config.int("REDIS_PORT").pipe(
        Config.withDefault(6379),
      );
      const redisUsername = yield* Config.string("REDIS_USERNAME").pipe(
        Config.withDefault("default"),
      );
      const redisPassword = yield* Config.string("REDIS_PASSWORD").pipe(
        Config.withDefault(""),
      );
      return ActivityConfig.of({
        environment,
        port: yield* Config.int("PORT"),
        serviceName: yield* Config.string("SERVICE_NAME").pipe(
          Config.withDefault("activity"),
        ),
        databaseUrl: yield* Config.string("POSTGRESQL_CONNECTION_URI"),
        rabbitmqUri: yield* Config.string("RABBITMQ_URI"),
        redisUrl:
          redisHost._tag === "Some"
            ? `redis://${encodeURIComponent(redisUsername)}:${encodeURIComponent(redisPassword)}@${redisHost.value}:${redisPort}`
            : environment === RuntimeEnvironment.LOCAL
              ? undefined
              : yield* Effect.die(
                  new Error(`REDIS_HOST is required when ENV=${environment}`),
                ),
        apiServiceUrl: yield* Config.string("API_SERVICE_URL"),
        signatureSecret,
      });
    }),
  );
}
