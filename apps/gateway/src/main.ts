import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { RabbitMessaging } from "@lootlog/messaging";
import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { GatewayServer } from "#src/app";
import { GatewayConfig } from "#src/config/gateway-config";

const ObservabilityLive = makeObservabilityLayer(GatewayConfig).pipe(
  Layer.provide(GatewayConfig.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(
      GatewayServer.pipe(Layer.provide(FetchHttpClient.layer)),
    );
  }).pipe(
    Effect.scoped,
    Effect.provide(ObservabilityLive),
    RabbitMessaging.supervised,
  ),
);
