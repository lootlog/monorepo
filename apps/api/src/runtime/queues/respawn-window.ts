import { acquireBullQueue } from "@lootlog/database/bullmq";
import type { Queue } from "bullmq";
import { Context, Effect, Layer } from "effect";
import type { AutoCloseRespawnWindowJobData } from "#src/events/respawn/auto-close-respawn-window-job-data";
import { RESPAWN_WINDOW_QUEUE } from "#src/events/respawn/respawn-queue.constant";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export class RespawnWindowQueue extends Context.Service<
  RespawnWindowQueue,
  Queue<AutoCloseRespawnWindowJobData>
>()("@lootlog/api/RespawnWindowQueue") {
  static readonly layer = Layer.effect(
    RespawnWindowQueue,
    Effect.flatMap(ApiRuntimeConfig, ({ redisUrl }) =>
      acquireBullQueue<AutoCloseRespawnWindowJobData>(
        RESPAWN_WINDOW_QUEUE,
        redisUrl,
      ),
    ),
  );
}
