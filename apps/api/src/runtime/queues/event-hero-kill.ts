import { acquireBullQueue, acquireBullWorker } from "@lootlog/database/bullmq";
import type { Job } from "bullmq";
import { Context, Effect, Layer, type Redacted } from "effect";
import type { EventHeroKillJobData } from "#src/events/kills/check-event-hero-kill-params";
import { EVENT_HERO_KILL_JOB_NAME } from "#src/events/kills/event-hero-kill-job";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/kills/event-hero-kill-queue.constant";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

/** Queues the event hero check of a committed kill report. */
export class EventHeroKillQueue extends Context.Service<
  EventHeroKillQueue,
  {
    readonly add: (
      jobId: string,
      data: EventHeroKillJobData,
    ) => Effect.Effect<void, unknown>;
  }
>()("@lootlog/api/EventHeroKillQueue") {
  static readonly layer = Layer.effect(
    EventHeroKillQueue,
    Effect.gen(function* () {
      const { redisUrl } = yield* ApiRuntimeConfig;

      const queue = yield* acquireBullQueue<EventHeroKillJobData>(
        EVENT_HERO_KILL_QUEUE,
        redisUrl,
      );

      return EventHeroKillQueue.of({
        add: (jobId, data) =>
          Effect.tryPromise({
            try: () =>
              queue.add(EVENT_HERO_KILL_JOB_NAME, data, {
                jobId,
                attempts: 5,
                backoff: { type: "exponential", delay: 1000 },
                removeOnComplete: true,
                removeOnFail: false,
              }),
            catch: (error) => error,
          }).pipe(Effect.asVoid),
      });
    }),
  );
}

export const acquireEventHeroKillWorker = (
  redisUrl: Redacted.Redacted<string>,
  processor: {
    readonly process: (job: Job<EventHeroKillJobData>) => Promise<void>;
    readonly onFailed: (job: Job<EventHeroKillJobData>, error: Error) => void;
  },
) =>
  acquireBullWorker<EventHeroKillJobData, void>(
    EVENT_HERO_KILL_QUEUE,
    redisUrl,
    (job) => processor.process(job),
  ).pipe(
    Effect.tap((worker) =>
      Effect.sync(() =>
        worker.on("failed", (job, error) => {
          if (job) processor.onFailed(job, error);
        }),
      ),
    ),
  );
