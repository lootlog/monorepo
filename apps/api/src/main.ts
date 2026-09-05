import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { RabbitMessaging } from "@lootlog/messaging";
import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { registerNodeWarningDiagnostics } from "#src/shared/diagnostics/node-warning-diagnostics";
import { apiConfiguration } from "#src/config/api.config";
import { ApiApplicationLive } from "./runtime/application/api-application.js";

const ObservabilityLive = makeObservabilityLayer(apiConfiguration);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    const config = yield* apiConfiguration;
    yield* Effect.sync(() => registerNodeWarningDiagnostics(config));
    yield* Layer.launch(
      ApiApplicationLive.pipe(Layer.provide(FetchHttpClient.layer)),
    );
  }).pipe(
    Effect.scoped,
    Effect.provide(ObservabilityLive),
    RabbitMessaging.supervised,
  ),
);
