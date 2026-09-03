import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { BotConfig } from "#src/config/bot-config";
import { BotApplication } from "./bot-application.js";

const ObservabilityLive = Layer.unwrap(
  Effect.map(BotConfig, (config) =>
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
  Layer.provide(BotConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(BotApplication);
  }).pipe(Effect.scoped, Effect.provide(ObservabilityLive)),
);
