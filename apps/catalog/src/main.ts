import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { RabbitMessaging } from "@lootlog/messaging";
import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogApplication } from "./catalog-application.js";

const ObservabilityLive = makeObservabilityLayer(CatalogConfig).pipe(
  Layer.provide(CatalogConfig.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(CatalogApplication);
  }).pipe(
    Effect.scoped,
    Effect.provide(ObservabilityLive),
    RabbitMessaging.supervised,
  ),
);
