import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { AuthRedisStorage } from "#src/auth/auth-redis-storage";
import { AuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/better-auth";
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

    return Layer.merge(
      OtlpTracer.layerFromConfig({ resource }),
      OtlpLogger.layerFromConfig({ resource, mergeWithExisting: true }),
    );
  }),
).pipe(
  Layer.provide(AppConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

const InfrastructureLive = Layer.merge(
  AuthDatabase.layer,
  AuthRedisStorage.layer,
).pipe(Layer.provide(AppConfig.layer));

const BetterAuthLive = BetterAuthRuntime.layer.pipe(
  Layer.provide(InfrastructureLive),
  Layer.provide(AppConfig.layer),
);

const AuthServicesLive = AuthService.layer.pipe(
  Layer.provideMerge(BetterAuthLive),
  Layer.provideMerge(InfrastructureLive),
  Layer.provideMerge(AppConfig.layer),
);

const ApplicationLive = AuthHttpServer.layer.pipe(
  Layer.provide(AuthServicesLive),
  Layer.provide(ObservabilityLive),
);

BunRuntime.runMain(Layer.launch(ApplicationLive));
