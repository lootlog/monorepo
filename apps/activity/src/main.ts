import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { RabbitMessaging } from "@lootlog/messaging";
import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { ActivityConfig } from "#src/config/activity-config";
import { ActivityApplication } from "./activity-application.js";

const ObservabilityLive = makeObservabilityLayer(ActivityConfig).pipe(
  Layer.provide(ActivityConfig.layer),
);

BunRuntime.runMain(
  Layer.launch(
    ActivityApplication.pipe(
      Layer.provide(FetchHttpClient.layer),
      Layer.provide(ObservabilityLive),
    ),
  ).pipe(RabbitMessaging.supervised),
);
