import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { BattlelogApplication } from "#src/battlelog-application";
import { BattlelogConfig } from "#src/config/env";
import { BattlelogHttpServer } from "#src/http/battlelog-http";

const HttpLive = BattlelogHttpServer.pipe(
  Layer.provide(BattlelogApplication.layer),
);

const ObservabilityLive = makeObservabilityLayer(BattlelogConfig).pipe(
  Layer.provide(BattlelogConfig.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(HttpLive);
  }).pipe(Effect.scoped, Effect.provide(ObservabilityLive)),
);
