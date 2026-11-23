import {
  baseServiceConfig,
  InvalidServiceConfiguration,
  type BaseServiceConfiguration,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import { type RpcUpstream, rpcUpstreamConfig } from "@lootlog/rpc/callers";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";

export interface ActivityConfigValue extends BaseServiceConfiguration {
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly redisUrl?: Redacted.Redacted<string>;
  readonly apiRpc: RpcUpstream;
  readonly signatureSecret: Redacted.Redacted<string>;
}

export class ActivityConfig extends Context.Service<
  ActivityConfig,
  ActivityConfigValue
>()("@lootlog/activity/ActivityConfig") {
  static readonly layer = Layer.effect(
    ActivityConfig,
    Effect.gen(function* () {
      const base = yield* baseServiceConfig("activity");
      const { environment } = base;

      const configuredSecret = yield* Config.option(
        Config.Redacted("ACTIVITY_EVENT_SIGNATURE_SECRET"),
      );

      const signatureSecret = Option.isSome(configuredSecret)
        ? configuredSecret.value
        : environment === RuntimeEnvironment.PROD ||
            environment === RuntimeEnvironment.STAGING
          ? yield* new InvalidServiceConfiguration({
              message: `ACTIVITY_EVENT_SIGNATURE_SECRET is required when ENV=${environment}`,
            })
          : Redacted.make("local-development-activity-event-signature-secret");

      if (Redacted.value(signatureSecret).length < 32)
        return yield* new InvalidServiceConfiguration({
          message:
            "ACTIVITY_EVENT_SIGNATURE_SECRET must contain at least 32 characters",
        });
      const redisHost = yield* Config.option(Config.String("REDIS_HOST"));

      return ActivityConfig.of({
        ...base,
        databaseUrl: yield* Config.Redacted("POSTGRESQL_CONNECTION_URI"),
        rabbitmqUri: yield* Config.Redacted("RABBITMQ_URI"),
        redisUrl: Option.isSome(redisHost)
          ? yield* redisUrlConfig
          : environment === RuntimeEnvironment.LOCAL
            ? undefined
            : yield* new InvalidServiceConfiguration({
                message: `REDIS_HOST is required when ENV=${environment}`,
              }),
        apiRpc: yield* rpcUpstreamConfig("activity", "api"),
        signatureSecret,
      });
    }),
  );
}
