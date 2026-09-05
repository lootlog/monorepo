import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";

export const makeObservabilityLayer = <E, R>(
  configuration: Effect.Effect<
    {
      readonly serviceName: string;
      readonly environment: string;
      readonly serviceNamespace: string;
    },
    E,
    R
  >,
) =>
  Layer.unwrap(
    Effect.map(configuration, (config) =>
      Otlp.layerFromConfig({
        resource: {
          serviceName: config.serviceName,
          attributes: {
            "deployment.environment.name": config.environment,
            "service.namespace": config.serviceNamespace,
          },
        },
        loggerMergeWithExisting: true,
      }),
    ),
  ).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  );
