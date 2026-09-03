import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { SearchConfig } from "#src/config/search-config";
import { SearchApplication } from "./search-application.js";

const ObservabilityLive = Layer.unwrap(
  Effect.map(SearchConfig, (config) =>
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
  Layer.provide(SearchConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(SearchApplication);
  }).pipe(Effect.scoped, Effect.provide(ObservabilityLive)),
);
