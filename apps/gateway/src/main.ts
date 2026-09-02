import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
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
    return Layer.merge(
      OtlpTracer.layerFromConfig({ resource }),
      OtlpLogger.layerFromConfig({ resource, mergeWithExisting: true }),
    );
  }),
).pipe(
  Layer.provide(GatewayConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Layer.launch(GatewayServer.pipe(Layer.provide(ObservabilityLive))),
);
