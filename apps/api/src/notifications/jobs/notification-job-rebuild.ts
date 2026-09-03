import { Clock, Effect } from "effect";
import type {
  NotificationJobStore,
  NotificationRuleWithTargets,
} from "#src/notifications/jobs/notification-job-store";
import type { NotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import {
  NotificationJobKind,
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationScheduleAnchor,
  NotificationScheduleStrategy,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";
import type { JsonValue } from "#src/notifications/notification-database.types";

export interface TimerUpdatedEvent {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly timerKey: string;
  readonly minSpawnTime: string | Date;
  readonly maxSpawnTime: string | Date;
  readonly npc?: { readonly name?: string } | null;
}

type RuleWithTargets = NotificationRuleWithTargets;
type Timer = Effect.Success<
  ReturnType<NotificationJobStore["findTimers"]>
>[number];

export interface NotificationRebuildStore {
  readonly findRule: (
    ruleId: number,
    withTargets: boolean,
  ) => Effect.Effect<RuleWithTargets | null, unknown, never>;
  readonly timers: (
    guildId: string,
    world: string | null,
  ) => Effect.Effect<readonly Timer[], unknown, never>;
}

export interface NotificationRebuildContent {
  readonly timer: (options: {
    readonly notificationRule: RuleWithTargets;
    readonly target: RuleWithTargets["targets"][number]["target"];
    readonly npcId: number;
    readonly npcName: string | null;
    readonly world: string;
    readonly timerKey: string;
    readonly minSpawnTime: Date;
    readonly maxSpawnTime: Date;
    readonly scheduledFor: Date;
  }) => JsonValue;
  readonly scheduledMessage: (options: {
    readonly notificationRule: RuleWithTargets;
    readonly target: RuleWithTargets["targets"][number]["target"];
    readonly scheduledFor: Date;
  }) => JsonValue;
}

export const timerSourceEntityId = (
  event: Pick<TimerUpdatedEvent, "guildId" | "world" | "timerKey">,
) => `${event.guildId}:${event.world}:${event.timerKey}`;

export const makeNotificationJobRebuild = (
  store: NotificationRebuildStore,
  matchesTimerRule: (filters: JsonValue | null, npcId: number) => boolean,
  hasRequiredGuildPermissions: (
    guildId: string,
  ) => Effect.Effect<boolean, unknown, never>,
  content: NotificationRebuildContent,
  scheduler: NotificationJobScheduler,
) => {
  const rebuildTimer = Effect.fn("notifications.jobs.rebuildTimer")(function* (
    ruleId: number,
    event: TimerUpdatedEvent,
  ) {
    const rule = yield* store.findRule(ruleId, true);
    if (
      !rule ||
      !rule.enabled ||
      rule.scheduleStrategy !==
        NotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE ||
      rule.scheduleAnchor === null ||
      rule.scheduleOffsetMinutes === null
    ) {
      return;
    }
    const sourceEntityId = timerSourceEntityId(event);
    yield* scheduler.cancel({
      ruleId,
      sourceEntityType: "timer",
      sourceEntityId,
    });
    const permitted =
      rule.ownerType === NotificationOwnerType.USER
        ? true
        : yield* hasRequiredGuildPermissions(rule.ownerId);
    const anchor =
      rule.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN
        ? new Date(event.maxSpawnTime)
        : new Date(event.minSpawnTime);
    const calculated = new Date(
      anchor.getTime() - rule.scheduleOffsetMinutes * 60_000,
    );
    const scheduledFor =
      calculated < new Date(yield* Clock.currentTimeMillis)
        ? new Date(yield* Clock.currentTimeMillis)
        : calculated;
    yield* Effect.forEach(
      rule.targets,
      ({ target }) => {
        if (!target.active || !target.canSend) return Effect.void;
        return scheduler
          .create({
            notificationRule: rule,
            target,
            jobKind: NotificationJobKind.SCHEDULED,
            scheduledFor,
            sourceEntityType: "timer",
            sourceEntityId,
            payloadSnapshot: content.timer({
              notificationRule: rule,
              target,
              npcId: event.npcId,
              npcName: event.npc?.name ?? null,
              world: event.world,
              timerKey: event.timerKey,
              minSpawnTime: new Date(event.minSpawnTime),
              maxSpawnTime: new Date(event.maxSpawnTime),
              scheduledFor,
            }),
            forceBlocked: !permitted || !target.canSend || !target.active,
          })
          .pipe(
            Effect.flatMap((job) =>
              job?.status === NotificationJobStatus.PENDING
                ? scheduler.enqueue(
                    job.id,
                    Math.max(0, scheduledFor.getTime() - Date.now()),
                  )
                : Effect.void,
            ),
          );
      },
      { concurrency: "unbounded", discard: true },
    );
  });

  const rebuildScheduled = Effect.fn("notifications.jobs.rebuildScheduled")(
    function* (ruleId: number) {
      const rule = yield* store.findRule(ruleId, true);
      if (!rule?.enabled || !rule.scheduledAt) return;
      const scheduledAt = rule.scheduledAt;
      if (scheduledAt < new Date(yield* Clock.currentTimeMillis)) return;
      if (rule.scheduledUntil && scheduledAt > rule.scheduledUntil) return;
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
    },
  );

  const rebuildRule = Effect.fn("notifications.jobs.rebuildRule")(function* (
    ruleId: number,
  ) {
    const rule = yield* store.findRule(ruleId, false);
    if (!rule) return;
    yield* scheduler.cancel({ ruleId });
    if (
      rule.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE &&
      rule.enabled &&
      rule.scheduledAt
    ) {
      return yield* rebuildScheduled(rule.id);
    }
    if (
      rule.triggerType !== NotificationTriggerType.TIMER_BEFORE_SPAWN ||
      !rule.enabled ||
      !rule.guildId ||
      rule.scheduleStrategy !==
        NotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE ||
      rule.scheduleAnchor === null ||
      rule.scheduleOffsetMinutes === null
    ) {
      return;
    }
    const timers = yield* store.timers(rule.guildId, rule.world);
    yield* Effect.forEach(
      timers,
      (timer) => {
        if (!matchesTimerRule(rule.filters, timer.npcId)) return Effect.void;
        const npc =
          timer.npc &&
          typeof timer.npc === "object" &&
          !Array.isArray(timer.npc)
            ? (timer.npc as { readonly name?: string })
            : null;
        return rebuildTimer(rule.id, { ...timer, npc });
      },
      { concurrency: "unbounded", discard: true },
    );
  });

  return { rebuildRule, rebuildScheduled, rebuildTimer };
};

export type NotificationJobRebuild = ReturnType<
  typeof makeNotificationJobRebuild
>;
