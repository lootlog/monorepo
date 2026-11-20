import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type { Job } from "bullmq";
import { Effect, Schema } from "effect";
import type { NotificationDispatchAttempt } from "#src/notifications/jobs/notification-job-dispatch";
import { NOTIFICATION_DISPATCH_JOB_OPTIONS } from "#src/notifications/jobs/dispatch-queue";

export interface NotificationDispatchJobData {
  notificationJobId: string;
}

export interface NotificationDispatch {
  readonly dispatch: (
    notificationJobId: string,
    attempt: NotificationDispatchAttempt,
  ) => Effect.Effect<void, unknown, never>;
}

class NotificationDispatchFailure extends TaggedErrorClass<NotificationDispatchFailure>()(
  "NotificationDispatchFailure",
  { jobId: Schema.String, cause: Schema.Defect() },
) {}

export const makeNotificationDispatchProcessor = (
  notifications: NotificationDispatch,
) =>
  Effect.fn("notifications.worker.dispatch")(function* (
    job: Job<NotificationDispatchJobData>,
  ) {
    if (!job.opts.attempts) {
      job.opts.attempts = NOTIFICATION_DISPATCH_JOB_OPTIONS.attempts;
      job.opts.backoff ??= NOTIFICATION_DISPATCH_JOB_OPTIONS.backoff;
    }

    yield* notifications
      .dispatch(job.data.notificationJobId, {
        retrying: job.attemptsMade > 0,
      })
      .pipe(
        Effect.mapError(
          (cause) =>
            new NotificationDispatchFailure({
              jobId: job.data.notificationJobId,
              cause,
            }),
        ),
      );
    yield* Effect.logInfo({
      message: "Notification dispatch job processed",
      notificationJobId: job.data.notificationJobId,
      queueJobId: job.id,
    });
  });
