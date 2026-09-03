import { BunRedis, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer, Redacted } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { AuthRedisStorage } from "#src/auth/storage/auth-redis-storage";
import { AuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { AppConfig } from "#src/config/env";
import { AuthDatabase } from "#src/database/drizzle";
import { AuthHttpServer } from "#src/http/server";

const ObservabilityLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const resource = {
      serviceName: config.serviceName,
      serviceVersion: config.commitSha,
      attributes: {
        "deployment.environment.name": config.environment,
        "service.namespace": config.serviceNamespace,
      },
    };

    return Otlp.layerFromConfig({
      resource,
      loggerMergeWithExisting: true,
    });
  }),
).pipe(
  Layer.provide(AppConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

const InfrastructureLive = Layer.merge(
  AuthDatabase.layer,
  AuthRedisStorage.layer,
).pipe(
  Layer.provide(
    Layer.unwrap(
      Effect.map(AppConfig, (config) =>
        BunRedis.layer({
          url: `redis://${encodeURIComponent(config.redis.username)}:${encodeURIComponent(Redacted.value(config.redis.password))}@${config.redis.host}:${config.redis.port}`,
          connectionTimeout: 1_000,
          enableOfflineQueue: false,
          maxRetries: 1,
        }),
      ),
    ),
  ),
  Layer.provide(AppConfig.layer),
);

const BetterAuthLive = BetterAuthRuntime.layer.pipe(
  Layer.provide(InfrastructureLive),
  Layer.provide(AppConfig.layer),
);

const AuthServicesLive = AuthService.layer.pipe(
  Layer.provideMerge(BetterAuthLive),
  Layer.provideMerge(InfrastructureLive),
  Layer.provideMerge(AppConfig.layer),
);

const ApplicationLive = AuthHttpServer.pipe(
  Layer.provide(AuthServicesLive),
  Layer.provide(ObservabilityLive),
);

BunRuntime.runMain(Layer.launch(ApplicationLive));
