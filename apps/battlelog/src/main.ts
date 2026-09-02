import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { BattlelogApplication } from "#src/app.factory";
import { BattlelogConfig } from "#src/config/env";
import { BattlelogHttpServer } from "#src/http/battlelog-http";

const ObservabilityLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* BattlelogConfig;
    const resource = {
      serviceName: config.serviceName,
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
  Layer.provide(BattlelogConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

const HttpLive = BattlelogHttpServer.pipe(
  Layer.provide(BattlelogApplication.layer),
);
const ApplicationLive = HttpLive.pipe(Layer.provide(ObservabilityLive));

BunRuntime.runMain(Layer.launch(ApplicationLive));
