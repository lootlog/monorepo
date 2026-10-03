import { Clock, Effect } from "effect";
import type { NotificationJobStore } from "#src/notifications/jobs/notification-job-store";
import type { NotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";

/** The `lastError` of a job closed because it was not sent in time. */
export const NOTIFICATION_MISSED_DELIVERY_REASON = "Missed delivery window";

// A due job is claimed within seconds; one still PENDING after this lost its
// queue entry, or exhausted its queue attempts before claiming the job.
const OVERDUE_AFTER_MS = 2 * 60_000;

// Later than this a reminder is stale: the event it announces has started.
// A timer warning stays useful until its spawn window closes, as when a timer
// update schedules it late.
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

/**
 * The dispatch queue is the only trigger of a PENDING job, and its entry is
 * written after the job row commits, so a failed write or a lost entry leaves
 * the row waiting forever. Each pass queues overdue jobs again while they are
 * still worth sending and closes the stale ones, which also lets a recurring
 * rule schedule its next occurrence.
 */
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
          // The queue keeps one entry per job id, so a live entry is kept and
          // dispatch claims the job at most once either way.
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
