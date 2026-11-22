import { Clock, Effect } from "effect";
import type { NotificationJobStore } from "#src/notifications/jobs/notification-job.repository";
import type { NotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";

export const NOTIFICATION_MISSED_DELIVERY_REASON = "Missed delivery window";

const OVERDUE_AFTER_MS = 2 * 60_000;

const MISSED_AFTER_MS = 15 * 60_000;

const BATCH_SIZE = 100;

const staleAt = (
  job: Effect.Success<ReturnType<NotificationJobStore["findOverdue"]>>[number],
) => {
  const spawnWindowEnd = job.maxSpawnTime
    ? Date.parse(job.maxSpawnTime)
    : Number.NaN;

  return Number.isNaN(spawnWindowEnd)
    ? job.scheduledFor.getTime() + MISSED_AFTER_MS
    : spawnWindowEnd;
};

export interface NotificationRecoveryStore {
  readonly findOverdue: NotificationJobStore["findOverdue"];
  readonly closeMissed: NotificationJobStore["closeMissed"];
}

export const makeNotificationJobRecovery = (
  store: NotificationRecoveryStore,
  enqueue: (jobId: string, delay: number) => Effect.Effect<void, unknown>,
  finalize: NotificationJobFinalization,
) =>
  Effect.fn("notifications.jobs.recoverOverdue")(function* () {
    const now = yield* Clock.currentTimeMillis;

    const overdue = yield* store.findOverdue(
      new Date(now - OVERDUE_AFTER_MS),
      BATCH_SIZE,
    );

    yield* Effect.forEach(
      overdue,
      (job) =>
        Effect.gen(function* () {
          if (now < staleAt(job)) {
            return yield* enqueue(job.id, 0);
          }

          if (
            yield* store.closeMissed(
              job.id,
              NOTIFICATION_MISSED_DELIVERY_REASON,
            )
          ) {
            yield* finalize(job);
          }
        }).pipe(
          Effect.catch((error) =>
            Effect.logError(
              "Overdue notification job recovery failed",
              error,
            ).pipe(Effect.annotateLogs({ notificationJobId: job.id })),
          ),
        ),
      { discard: true },
    );
  });

export type NotificationJobRecovery = ReturnType<
  typeof makeNotificationJobRecovery
>;
