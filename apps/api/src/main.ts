import { BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { registerNodeWarningDiagnostics } from "#src/shared/diagnostics/node-warning-diagnostics";
import { apiConfiguration } from "#src/config/api.config";
import { ApiApplicationLive } from "./http-api/runtime/application/api-application.js";

const ObservabilityLive = Layer.unwrap(
  Effect.map(apiConfiguration, (config) =>
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

BunRuntime.runMain(
  Effect.gen(function* () {
    const config = yield* apiConfiguration;
    yield* Effect.sync(() => registerNodeWarningDiagnostics(config));
    yield* Layer.launch(
      ApiApplicationLive.pipe(
        Layer.provide(FetchHttpClient.layer),
        Layer.provide(ObservabilityLive),
      ),
    );
  }),
);
