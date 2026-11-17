import { runService } from "@lootlog/instrumentation/service";
import { RabbitMessaging } from "@lootlog/messaging";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { ActivityConfig } from "#src/config/activity-config";
import { ActivityApplication } from "./activity-application.js";

runService({
  config: ActivityConfig.pipe(Effect.provide(ActivityConfig.layer)),
  application: ActivityApplication.pipe(Layer.provide(FetchHttpClient.layer)),
  supervise: RabbitMessaging.supervised,
});
