import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { RabbitMessaging } from "@lootlog/messaging";
import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { SearchConfig } from "#src/config/search-config";
import { SearchApplication } from "./search-application.js";

const ObservabilityLive = makeObservabilityLayer(SearchConfig).pipe(
  Layer.provide(SearchConfig.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(SearchApplication);
  }).pipe(
    Effect.scoped,
    Effect.provide(ObservabilityLive),
    RabbitMessaging.supervised,
  ),
);
