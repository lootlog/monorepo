import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { RabbitMessaging } from "@lootlog/messaging";
import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { BotConfig } from "#src/config/bot-config";
import { BotApplication } from "./bot-application.js";

const ObservabilityLive = makeObservabilityLayer(BotConfig).pipe(
  Layer.provide(BotConfig.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(BotApplication);
  }).pipe(
    Effect.scoped,
    Effect.provide(ObservabilityLive),
    RabbitMessaging.supervised,
  ),
);
