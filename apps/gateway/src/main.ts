import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { GatewayServer } from "#src/app";
import { GatewayConfig } from "#src/config/gateway-config";

const ObservabilityLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* GatewayConfig;
    const resource = {
      serviceName: config.serviceName,
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
  Layer.provide(GatewayConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Layer.launch(
    GatewayServer.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(ObservabilityLive),
    ),
  ),
);
