import { Effect } from "effect";
import type {
  NotificationDeliveryUpdate,
  NotificationStoredJob,
} from "#src/notifications/jobs/notification-job.repository";
import type { NotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import type { NotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import {
  type DiscordNotificationDeliveryResultEvent,
  NotificationJobStatus,
  NotificationOwnerType,
} from "@lootlog/schema/notifications";

type NotificationDeliveryJob = NotificationStoredJob;

export interface NotificationDeliveryStore {
  readonly find: (
    jobId: string,
  ) => Effect.Effect<NotificationDeliveryJob | null, unknown, never>;
  readonly record: (
    options: NotificationDeliveryUpdate,
  ) => Effect.Effect<unknown, unknown, never>;
}

/**
 * Codes the Discord bot reports when the target channel no longer exists:
 * Discord's own 10003 (Unknown Channel) and the bot's empty channel lookup.
 */
const DELETED_CHANNEL_ERROR_CODES: ReadonlySet<string> = new Set([
  "10003",
  "CHANNEL_NOT_FOUND",
]);

export const makeNotificationDeliveryResult = (
  store: NotificationDeliveryStore,
  scheduler: Pick<NotificationJobScheduler, "enqueue">,
  finalize: NotificationJobFinalization,
  removeGuildTarget: (
    guildId: string,
    targetId: number,
  ) => Effect.Effect<unknown, unknown, never>,
) =>
  Effect.fn("notifications.deliveryResult")(function* (
    event: DiscordNotificationDeliveryResultEvent,
  ) {
    const job = yield* store.find(event.notificationJobId);

    if (
      !job ||
      job.status === NotificationJobStatus.SENT ||
      job.status === NotificationJobStatus.CANCELED
    ) {
      return;
    }

    // A channel deletion the bot never reported (it was offline, or the
    // channel left the snapshot earlier) would otherwise fail every later
    // notification. Apply the same removal as the channel-deleted fact.
    const channelDeleted =
      !event.success &&
      job.ownerType === NotificationOwnerType.GUILD &&
      event.errorCode !== undefined &&
      DELETED_CHANNEL_ERROR_CODES.has(event.errorCode);

    if (job.status === NotificationJobStatus.FAILED && !event.success) {
      // A redelivered result whose removal failed after the job was recorded:
      // the job stays terminal, only the removal is resumed.
      if (channelDeleted) yield* removeGuildTarget(job.ownerId, job.targetId);

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

    if (channelDeleted) yield* removeGuildTarget(job.ownerId, job.targetId);
  });
