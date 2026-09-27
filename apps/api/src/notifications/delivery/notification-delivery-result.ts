import { Effect } from "effect";
import type { DiscordNotificationDeliveryResultEvent } from "@lootlog/schema/notifications";
import type {
  NotificationDeliveryUpdate,
  NotificationStoredJob,
} from "#src/notifications/jobs/notification-job-store";
import type { NotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import type { NotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import { NotificationJobStatus } from "#src/notifications/notification-enums";

export type NotificationDeliveryJob = NotificationStoredJob;

export interface NotificationDeliveryStore {
  readonly find: (
    jobId: string,
  ) => Effect.Effect<NotificationDeliveryJob | null, unknown, never>;
  readonly record: (
    options: NotificationDeliveryUpdate,
  ) => Effect.Effect<unknown, unknown, never>;
}

export const makeNotificationDeliveryResult = (
  store: NotificationDeliveryStore,
  scheduler: Pick<NotificationJobScheduler, "enqueue">,
  finalize: NotificationJobFinalization,
) =>
  Effect.fn("notifications.deliveryResult")(function* (
    event: DiscordNotificationDeliveryResultEvent,
  ) {
    const job = yield* store.find(event.notificationJobId);

    if (
      !job ||
      job.status === NotificationJobStatus.SENT ||
      job.status === NotificationJobStatus.CANCELED ||
      (job.status === NotificationJobStatus.FAILED && !event.success)
    ) {
      return;
    }

    const deliveredAt = new Date(event.deliveredAt);

    if (event.success) {
      yield* store.record({
        jobId: job.id,
        targetId: job.targetId,
        job: {
          status: NotificationJobStatus.SENT,
          processedAt: deliveredAt,
          providerMessageId: event.providerMessageId ?? null,
          lastError: null,
        },
        target: { lastDeliveryAt: deliveredAt, lastDeliveryError: null },
        targetFirst: false,
      });
      yield* finalize(job);

      return;
    }

    const failure =
      event.errorMessage ?? event.errorCode ?? "Notification delivery failed";

    const shouldRetry = event.retryable && job.attemptCount <= 3;
    yield* store.record({
      jobId: job.id,
      targetId: job.targetId,
      target: { lastDeliveryError: failure },
      job: shouldRetry
        ? { status: NotificationJobStatus.PENDING, lastError: failure }
        : {
            status: NotificationJobStatus.FAILED,
            processedAt: deliveredAt,
            lastError: failure,
          },
    });

    if (shouldRetry) {
      yield* scheduler.enqueue(
        job.id,
        Math.max(30_000, job.attemptCount * 30_000),
      );

      return;
    }

    yield* finalize(job);
  });
