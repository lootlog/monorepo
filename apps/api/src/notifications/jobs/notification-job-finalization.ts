import type { OperationError } from "@lootlog/instrumentation/operation";
import { Effect } from "effect";
import type { NotificationStoredJob } from "#src/notifications/jobs/notification-job.repository";

export const makeNotificationJobFinalization = (
  prune: (
    owner: Pick<NotificationStoredJob, "ownerType" | "ownerId">,
  ) => Effect.Effect<void, OperationError>,
  scheduleNext: (ruleId: number) => Effect.Effect<void, unknown>,
) =>
  Effect.fn("notifications.jobs.finalize")(function* (
    job: Pick<
      NotificationStoredJob,
      "ownerType" | "ownerId" | "sourceEntityType" | "ruleId"
    >,
  ) {
    yield* prune({ ownerType: job.ownerType, ownerId: job.ownerId });

    if (job.sourceEntityType === "scheduled-message") {
      yield* scheduleNext(job.ruleId);
    }
  });

export type NotificationJobFinalization = ReturnType<
  typeof makeNotificationJobFinalization
>;
