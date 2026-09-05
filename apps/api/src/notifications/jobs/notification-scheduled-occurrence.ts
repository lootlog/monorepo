import { Effect } from "effect";
import type { NotificationRuleWithTargets } from "./notification-job-store.js";
import type { NotificationJobScheduler } from "./notification-job-scheduler.js";
import type { NotificationRecurrenceContent } from "./notification-job-recurrence.js";
import {
  NotificationJobKind,
  NotificationJobStatus,
} from "#src/notifications/notification-enums";

export const scheduleNotificationOccurrence = (
  rule: NotificationRuleWithTargets,
  scheduledAt: Date,
  permitted: boolean,
  content: NotificationRecurrenceContent,
  scheduler: Pick<NotificationJobScheduler, "create" | "enqueue">,
) => {
  return Effect.forEach(
    rule.targets,
    ({ target }) => {
      if (!target.active || !target.canSend) return Effect.void;
      return scheduler
        .create({
          notificationRule: rule,
          target,
          jobKind: NotificationJobKind.SCHEDULED,
          scheduledFor: scheduledAt,
          sourceEntityType: "scheduled-message",
          sourceEntityId: String(rule.id),
          payloadSnapshot: content.scheduledMessage({
            notificationRule: rule,
            target,
            scheduledFor: scheduledAt,
          }),
          forceBlocked: !permitted || !target.canSend || !target.active,
        })
        .pipe(
          Effect.flatMap((job) =>
            job?.status === NotificationJobStatus.PENDING
              ? scheduler.enqueue(
                  job.id,
                  Math.max(0, scheduledAt.getTime() - Date.now()),
                )
              : Effect.void,
          ),
        );
    },
    { concurrency: "unbounded", discard: true },
  );
};
