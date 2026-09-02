import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
  OtlpLogger,
  OtlpSerialization,
  OtlpTracer,
} from "effect/unstable/observability";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

/** OTLP logging and tracing with the same service resource used by other apps. */
export const ApiObservabilityLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
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
  Layer.provide(ApiRuntimeConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);
