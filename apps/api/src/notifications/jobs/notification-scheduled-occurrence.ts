import { Effect } from "effect";
import type { NotificationRuleWithTargets } from "./notification-job.repository.js";
import {
  enqueuePendingNotificationJob,
  type NotificationJobScheduler,
} from "./notification-job-scheduler.js";
import type { NotificationRecurrenceContent } from "./notification-job-recurrence.js";
import { NotificationJobKind } from "@lootlog/schema/notifications";

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
            enqueuePendingNotificationJob(scheduler, job, scheduledAt),
          ),
        );
    },
    { concurrency: "unbounded", discard: true },
  );
};
