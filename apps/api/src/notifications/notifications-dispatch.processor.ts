import type { Job } from "bullmq";
import { Effect, Schema } from "effect";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";

export interface NotificationDispatchJobData {
  notificationJobId: string;
}

export interface NotificationDispatch {
  readonly dispatch: (
    notificationJobId: string,
  ) => Effect.Effect<void, unknown, never>;
}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class NotificationDispatchFailure extends Schema.TaggedError<NotificationDispatchFailure>()(
  "NotificationDispatchFailure",
  { jobId: Schema.String, cause: Schema.Defect() },
) {}

export const makeNotificationDispatchProcessor = (
  notifications: NotificationDispatch,
  logger: Logger,
) =>
  Effect.fn("notifications.worker.dispatch")(function* (
    job: Job<NotificationDispatchJobData>,
  ) {
    yield* notifications.dispatch(job.data.notificationJobId).pipe(
      Effect.mapError(
        (cause) =>
          new NotificationDispatchFailure({
            jobId: job.data.notificationJobId,
            cause,
          }),
      ),
    );
    logger.log({
      level: "info",
      message: "Notification dispatch job processed",
      notificationJobId: job.data.notificationJobId,
      queueJobId: job.id,
    });
  });
