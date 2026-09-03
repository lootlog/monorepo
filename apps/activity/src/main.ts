import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { ActivityConfig } from "#src/config/activity-config";
import { ActivityApplication } from "./activity-application.js";

const ObservabilityLive = Layer.unwrap(
  Effect.map(ActivityConfig, (config) =>
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
  Layer.provide(ActivityConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);
BunRuntime.runMain(
  Layer.launch(
    ActivityApplication.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(ObservabilityLive),
    ),
  ),
);
