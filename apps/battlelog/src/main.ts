import { BunRuntime } from "@effect/platform-bun";
import { installScopedLogRunner } from "@lootlog/instrumentation";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { Otlp, OtlpSerialization } from "effect/unstable/observability";
import { BattlelogApplication } from "#src/battlelog-application";
import { BattlelogConfig } from "#src/config/env";
import { BattlelogHttpServer } from "#src/http/battlelog-http";

const ObservabilityLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* BattlelogConfig;
    const resource = {
      serviceName: config.serviceName,
      attributes: {
        "deployment.environment.name": config.environment,
        "service.namespace": config.serviceNamespace,
      },
    };

    return Otlp.layerFromConfig({
      resource,
      loggerMergeWithExisting: true,
    });
  }),
).pipe(
  Layer.provide(BattlelogConfig.layer),
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

const HttpLive = BattlelogHttpServer.pipe(
  Layer.provide(BattlelogApplication.layer),
);

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* installScopedLogRunner;
    yield* Layer.launch(HttpLive);
  }).pipe(Effect.scoped, Effect.provide(ObservabilityLive)),
);
