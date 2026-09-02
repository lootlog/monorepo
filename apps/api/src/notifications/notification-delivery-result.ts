import { Effect } from "effect";
import type { DiscordNotificationDeliveryResultEvent } from "@lootlog/schema/notifications";
import type {
  NotificationDeliveryUpdate,
  NotificationStoredJob,
} from "./notification-job-store.js";
import type { NotificationJobScheduler } from "./notification-job-scheduler.js";
import {
  NotificationJobStatus,
  type NotificationOwnerType,
} from "./notification-enums.js";

export type NotificationDeliveryJob = NotificationStoredJob;

const finalStatuses: readonly NotificationJobStatus[] = [
  NotificationJobStatus.SENT,
  NotificationJobStatus.FAILED,
  NotificationJobStatus.CANCELED,
];

export interface NotificationDeliveryStore {
  readonly find: (
    jobId: string,
  ) => Effect.Effect<NotificationDeliveryJob | null, unknown, never>;
  readonly record: (
    options: NotificationDeliveryUpdate,
  ) => Effect.Effect<unknown, unknown, never>;
  readonly prune: (owner: {
    readonly ownerType: NotificationOwnerType;
    readonly ownerId: string;
  }) => Effect.Effect<unknown, unknown, never>;
}

export const makeNotificationDeliveryResult = (
  store: NotificationDeliveryStore,
  scheduler: Pick<NotificationJobScheduler, "enqueue">,
  scheduleNext: (ruleId: number) => Effect.Effect<unknown, unknown, never>,
) =>
  Effect.fn("notifications.deliveryResult")(function* (
    event: DiscordNotificationDeliveryResultEvent,
  ) {
    const job = yield* store.find(event.notificationJobId);
    if (!job || finalStatuses.includes(job.status)) return;
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
      yield* store.prune({ ownerType: job.ownerType, ownerId: job.ownerId });
      if (job.sourceEntityType === "scheduled-message") {
        yield* scheduleNext(job.ruleId);
      }
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
    yield* store.prune({ ownerType: job.ownerType, ownerId: job.ownerId });
    if (job.sourceEntityType === "scheduled-message") {
      yield* scheduleNext(job.ruleId);
    }
  });
