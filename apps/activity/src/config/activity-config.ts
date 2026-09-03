import {
  RuntimeEnvironment,
  RuntimeEnvironmentSchema,
} from "@lootlog/schema/runtime-environment";
import { Config, Context, Effect, Layer, Redacted } from "effect";

export interface ActivityConfigValue {
  readonly environment: RuntimeEnvironment;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redisUrl?: Redacted.Redacted<string>;
  readonly apiServiceUrl: string;
  readonly signatureSecret: Redacted.Redacted<string>;
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
        Config.redacted("ACTIVITY_EVENT_SIGNATURE_SECRET"),
      );
      const signatureSecret =
        configuredSecret._tag === "Some"
          ? configuredSecret.value
          : environment === RuntimeEnvironment.PROD ||
              environment === RuntimeEnvironment.STAGING
            ? yield* Effect.fail(
                new Error(
                  `ACTIVITY_EVENT_SIGNATURE_SECRET is required when ENV=${environment}`,
                ),
              )
            : Redacted.make(
                "local-development-activity-event-signature-secret",
              );
      if (Redacted.value(signatureSecret).length < 32)
        return yield* Effect.fail(
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
        serviceNamespace: yield* Config.string("SERVICE_NAMESPACE").pipe(
          Config.withDefault("local"),
        ),
        databaseUrl: yield* Config.redacted("POSTGRESQL_CONNECTION_URI"),
        rabbitmqUri: yield* Config.redacted("RABBITMQ_URI"),
        redisUrl:
          redisHost._tag === "Some"
            ? Redacted.make(
                `redis://${encodeURIComponent(redisUsername)}:${encodeURIComponent(redisPassword)}@${redisHost.value}:${redisPort}`,
              )
            : environment === RuntimeEnvironment.LOCAL
              ? undefined
              : yield* Effect.fail(
                  new Error(`REDIS_HOST is required when ENV=${environment}`),
                ),
        apiServiceUrl: yield* Config.string("API_SERVICE_URL"),
        signatureSecret,
      });
    }),
  );
}
