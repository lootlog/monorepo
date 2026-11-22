import { promiseOperation } from "@lootlog/instrumentation/operation";
import { acquireBullQueue, acquireBullWorker } from "@lootlog/database/bullmq";
import type { Job } from "bullmq";
import { Context, Effect, Layer, type Redacted } from "effect";
import type { NotificationDispatchJobData } from "#src/notifications/delivery/notifications-dispatch.processor";
import {
  NOTIFICATIONS_DISPATCH_QUEUE,
  NOTIFICATION_DISPATCH_JOB_OPTIONS,
} from "#src/notifications/jobs/dispatch-queue";
import type { NotificationQueue } from "#src/notifications/jobs/notification-job-scheduler";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export class NotificationDispatchQueue extends Context.Service<
  NotificationDispatchQueue,
  NotificationQueue
>()("@lootlog/api/NotificationDispatchQueue") {
  static readonly layer = Layer.effect(
    NotificationDispatchQueue,
    Effect.gen(function* () {
      const { redisUrl } = yield* ApiRuntimeConfig;

      const queue = yield* acquireBullQueue<NotificationDispatchJobData>(
        NOTIFICATIONS_DISPATCH_QUEUE,
        redisUrl,
      );

      return NotificationDispatchQueue.of({
        add: (notificationJobId, delay) =>
          promiseOperation("notifications.dispatch.queue.add", () =>
            queue.add(
              notificationJobId,
              { notificationJobId },
              {
                ...NOTIFICATION_DISPATCH_JOB_OPTIONS,
                jobId: notificationJobId,
                delay,
              },
            ),
          ).pipe(Effect.asVoid),
        remove: (notificationJobId) =>
          promiseOperation("notifications.dispatch.queue.remove", async () => {
            const job = await queue.getJob(notificationJobId);
            await job?.remove();
          }),
      });
    }),
  );
}

export const acquireNotificationDispatchWorker = (
  redisUrl: Redacted.Redacted<string>,
  process: (job: Job<NotificationDispatchJobData>) => Promise<void>,
) => acquireBullWorker(NOTIFICATIONS_DISPATCH_QUEUE, redisUrl, process);
