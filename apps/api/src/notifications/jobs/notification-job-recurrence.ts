import { Effect } from "effect";
import type { NotificationRuleWithTargets } from "#src/notifications/jobs/notification-job-store";
import type { NotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import {
  NotificationJobKind,
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationScheduleIntervalType,
} from "#src/notifications/notification-enums";
import { GUILD_NOTIFICATION_TIMEZONE } from "#src/notifications/rules/schedule-timezone";
import { calculateNextOccurrenceInTimeZone } from "#src/notifications/rules/notification-schedule-time";
import type { JsonValue } from "#src/notifications/notification-database.types";

export type NotificationRecurringRule = NotificationRuleWithTargets;

const finalStatuses: readonly NotificationJobStatus[] = [
  NotificationJobStatus.SENT,
  NotificationJobStatus.FAILED,
  NotificationJobStatus.CANCELED,
];

export interface NotificationRecurrenceStore {
  readonly findRule: (
    ruleId: number,
  ) => Effect.Effect<NotificationRecurringRule | null, unknown, never>;
  readonly cycleStatuses: (
    ruleId: number,
    scheduledFor: Date,
  ) => Effect.Effect<
    readonly { readonly status: NotificationJobStatus }[],
    unknown,
    never
  >;
  readonly advance: (
    ruleId: number,
    current: Date,
    next: Date,
  ) => Effect.Effect<boolean, unknown, never>;
}

export interface NotificationRecurrenceContent {
  readonly scheduledMessage: (options: {
    readonly notificationRule: NotificationRecurringRule;
    readonly target: NotificationRecurringRule["targets"][number]["target"];
    readonly scheduledFor: Date;
  }) => JsonValue;
}

export const makeNotificationJobRecurrence = (
  store: NotificationRecurrenceStore,
  hasRequiredGuildPermissions: (
    guildId: string,
  ) => Effect.Effect<boolean, unknown, never>,
  content: NotificationRecurrenceContent,
  scheduler: Pick<NotificationJobScheduler, "create" | "enqueue">,
) =>
  Effect.fn("notifications.jobs.scheduleNext")(function* (ruleId: number) {
    const rule = yield* store.findRule(ruleId);
    if (
      !rule ||
      !rule.enabled ||
      !rule.scheduledAt ||
      !rule.scheduleIntervalType ||
      rule.scheduleIntervalType === NotificationScheduleIntervalType.ONCE
    ) {
      return;
    }
    const statuses = yield* store.cycleStatuses(ruleId, rule.scheduledAt);
    if (statuses.some(({ status }) => !finalStatuses.includes(status))) return;
    const next = calculateNextOccurrenceInTimeZone({
      currentScheduledAt: rule.scheduledAt,
      intervalType: rule.scheduleIntervalType,
      intervalValue: rule.scheduleIntervalValue,
      weekday: rule.scheduleWeekday,
      timeOfDay: rule.scheduleTimeOfDay,
      timeZone:
        rule.scheduleTimezone ??
        (rule.ownerType === NotificationOwnerType.GUILD
          ? GUILD_NOTIFICATION_TIMEZONE
          : "UTC"),
    });
    if (!next) return;
    if (rule.scheduledUntil && next > rule.scheduledUntil) return;
    if (!(yield* store.advance(ruleId, rule.scheduledAt, next))) return;
    const permitted =
      rule.ownerType === NotificationOwnerType.USER
        ? true
        : yield* hasRequiredGuildPermissions(rule.ownerId);
    yield* Effect.forEach(
      rule.targets,
      ({ target }) => {
        if (!target.active || !target.canSend) return Effect.void;
        return scheduler
          .create({
            notificationRule: rule,
            target,
            jobKind: NotificationJobKind.SCHEDULED,
            scheduledFor: next,
            sourceEntityType: "scheduled-message",
            sourceEntityId: String(rule.id),
            payloadSnapshot: content.scheduledMessage({
              notificationRule: rule,
              target,
              scheduledFor: next,
            }),
            forceBlocked: !permitted || !target.canSend || !target.active,
          })
          .pipe(
            Effect.flatMap((job) =>
              job?.status === NotificationJobStatus.PENDING
                ? scheduler.enqueue(
                    job.id,
                    Math.max(0, next.getTime() - Date.now()),
                  )
                : Effect.void,
            ),
          );
      },
      { concurrency: "unbounded", discard: true },
    );
  });
