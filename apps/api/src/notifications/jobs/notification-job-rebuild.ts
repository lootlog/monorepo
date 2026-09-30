import { scheduleNotificationOccurrence } from "./notification-scheduled-occurrence.js";
import { Clock, Effect, Predicate } from "effect";
import type {
  NotificationJobStore,
  NotificationRuleWithTargets,
  NotificationStoredRule,
} from "#src/notifications/jobs/notification-job-store";
import {
  enqueuePendingNotificationJob,
  type NotificationJobScheduler,
} from "#src/notifications/jobs/notification-job-scheduler";
import {
  NotificationJobKind,
  NotificationOwnerType,
  NotificationScheduleAnchor,
  NotificationScheduleStrategy,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";
import type { JsonValue } from "#src/database/json";
import { notificationMatchingPolicy } from "#src/notifications/rules/notification-matching.service";
import {
  timerNpcIdentity,
  type TimerNpcIdentity,
} from "#src/timers/timer-projection";

export interface TimerUpdatedEvent {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly timerKey: string;
  readonly minSpawnTime: string | Date;
  readonly maxSpawnTime: string | Date;
  readonly npc?: {
    readonly name?: string;
    readonly templateId?: number | null;
  } | null;
}

type RuleWithTargets = NotificationRuleWithTargets;

type RuleTarget = RuleWithTargets["targets"][number];

type Timer = Effect.Success<
  ReturnType<NotificationJobStore["findTimers"]>
>[number];

export interface NotificationRebuildStore {
  readonly findRule: (
    ruleId: number,
  ) => Effect.Effect<RuleWithTargets | null, unknown, never>;
  readonly findRules: (
    ruleIds: readonly number[],
  ) => Effect.Effect<readonly RuleWithTargets[], unknown, never>;
  readonly timers: (
    guildId: string,
    world: string | null,
  ) => Effect.Effect<readonly Timer[], unknown, never>;
}

export interface NotificationRebuildContent {
  readonly timer: (options: {
    readonly notificationRule: RuleWithTargets;
    readonly target: RuleTarget["target"];
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
    readonly target: RuleTarget["target"];
    readonly scheduledFor: Date;
  }) => JsonValue;
}

interface NotificationTimerRebuildFailure {
  readonly ruleId: number;
  readonly cause: unknown;
}

// Bounds the job inserts and queue writes one rebuild keeps in flight.
const REBUILD_CONCURRENCY = 4;

export const timerSourceEntityId = (
  event: Pick<TimerUpdatedEvent, "guildId" | "world" | "timerKey">,
) => `${event.guildId}:${event.world}:${event.timerKey}`;

const isSchedulableTimerRule = <Rule extends NotificationStoredRule>(
  rule: Rule,
): rule is Rule & {
  readonly scheduleAnchor: NotificationScheduleAnchor;
  readonly scheduleOffsetMinutes: number;
} =>
  rule.enabled &&
  rule.scheduleStrategy ===
    NotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE &&
  rule.scheduleAnchor !== null &&
  rule.scheduleOffsetMinutes !== null;

const isEligibleTarget = ({ target }: RuleTarget) =>
  target.active && target.canSend;

export const makeNotificationJobRebuild = (
  store: NotificationRebuildStore,
  matchesTimerRule: (
    filters: JsonValue | null,
    timer: TimerNpcIdentity,
  ) => boolean,
  hasRequiredGuildPermissions: (
    guildId: string,
  ) => Effect.Effect<boolean, unknown, never>,
  content: NotificationRebuildContent,
  scheduler: NotificationJobScheduler,
) => {
  const permitted = (rule: NotificationStoredRule) =>
    rule.ownerType === NotificationOwnerType.USER
      ? Effect.succeed(true)
      : hasRequiredGuildPermissions(rule.ownerId);

  // Shares one permission lookup per owner within a single timer update.
  const permittedByOwner = Effect.fnUntraced(function* (
    rules: readonly NotificationStoredRule[],
  ) {
    const owners = new Map<string, Effect.Effect<boolean, unknown, never>>();

    for (const rule of rules) {
      const key = `${rule.ownerType}:${rule.ownerId}`;

      if (!owners.has(key)) {
        owners.set(key, yield* Effect.cached(permitted(rule)));
      }
    }

    return (rule: NotificationStoredRule) =>
      owners.get(`${rule.ownerType}:${rule.ownerId}`) ?? permitted(rule);
  });

  const timerSchedule = (
    rule: NotificationStoredRule & {
      readonly scheduleAnchor: NotificationScheduleAnchor;
      readonly scheduleOffsetMinutes: number;
    },
    event: TimerUpdatedEvent,
    now: Date,
  ) => {
    const anchor =
      rule.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN
        ? new Date(event.maxSpawnTime)
        : new Date(event.minSpawnTime);

    const calculated = new Date(
      anchor.getTime() - rule.scheduleOffsetMinutes * 60_000,
    );

    return {
      event,
      sourceEntityId: timerSourceEntityId(event),
      scheduledFor: calculated < now ? now : calculated,
    };
  };

  const createTimerJob = (
    rule: RuleWithTargets,
    target: RuleTarget["target"],
    schedule: ReturnType<typeof timerSchedule>,
    isPermitted: boolean,
  ) => {
    const { event, sourceEntityId, scheduledFor } = schedule;

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
        forceBlocked: !isPermitted,
      })
      .pipe(
        Effect.flatMap((job) =>
          enqueuePendingNotificationJob(scheduler, job, scheduledFor),
        ),
      );
  };

  // Rebuilds one timer's jobs for every rule the caller matched to it. The
  // rules are re-read together, so a rule disabled or edited since the caller
  // listed it is not rebuilt from its old row. Rules share one permission
  // lookup per owner; each rule's failure is reported without stopping the
  // others.
  const rebuildTimer = Effect.fn("notifications.jobs.rebuildTimer")(function* (
    ruleIds: readonly number[],
    event: TimerUpdatedEvent,
  ) {
    if (ruleIds.length === 0) return [];

    const schedulable = (yield* store.findRules(ruleIds))
      .filter(isSchedulableTimerRule)
      .filter((rule) =>
        matchesTimerRule(rule.filters, timerNpcIdentity(event)),
      );

    if (schedulable.length === 0) return [];
    const permittedFor = yield* permittedByOwner(schedulable);
    const now = new Date(yield* Clock.currentTimeMillis);

    const [failures] = yield* Effect.partition(
      schedulable,
      (rule) => {
        const schedule = timerSchedule(rule, event, now);

        return Effect.gen(function* () {
          yield* scheduler.cancel({
            ruleId: rule.id,
            sourceEntityType: "timer",
            sourceEntityId: schedule.sourceEntityId,
          });

          const eligible = rule.targets.filter(isEligibleTarget);

          if (eligible.length === 0) return;
          const isPermitted = yield* permittedFor(rule);

          yield* Effect.forEach(
            eligible,
            ({ target }) => createTimerJob(rule, target, schedule, isPermitted),
            { discard: true },
          );
        }).pipe(
          Effect.mapError((cause): NotificationTimerRebuildFailure => ({
            ruleId: rule.id,
            cause,
          })),
        );
      },
      { concurrency: REBUILD_CONCURRENCY },
    );

    return failures;
  });

  const rebuildScheduled = Effect.fnUntraced(function* (
    rule: RuleWithTargets,
    scheduledAt: Date,
  ) {
    if (scheduledAt < new Date(yield* Clock.currentTimeMillis)) return;

    if (rule.scheduledUntil && scheduledAt > rule.scheduledUntil) return;

    yield* scheduleNotificationOccurrence(
      rule,
      scheduledAt,
      yield* permitted(rule),
      content,
      scheduler,
    );
  });

  const rebuildRule = Effect.fn("notifications.jobs.rebuildRule")(function* (
    ruleId: number,
  ) {
    const rule = yield* store.findRule(ruleId);

    if (!rule) return;
    yield* scheduler.cancel({ ruleId });

    if (
      rule.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE &&
      rule.enabled &&
      rule.scheduledAt
    ) {
      return yield* rebuildScheduled(rule, rule.scheduledAt);
    }

    if (
      rule.triggerType !== NotificationTriggerType.TIMER_BEFORE_SPAWN ||
      !rule.guildId ||
      !isSchedulableTimerRule(rule)
    ) {
      return;
    }

    const eligible = rule.targets.filter(isEligibleTarget);

    if (eligible.length === 0) return;

    const organizationTimers = yield* store.timers(rule.guildId, rule.world);

    const unmatched = notificationMatchingPolicy.unmatchedTimerSelections(
      rule.filters,
      organizationTimers.map(timerNpcIdentity),
    );

    // Once per rule rebuild, never per timer event: a saved selection that
    // matches no timer in the rule's Organization and world schedules nothing.
    if (unmatched.npcIds.length > 0 || unmatched.templateIds.length > 0) {
      yield* Effect.logWarning(
        "Notification rule NPC selections match no timer",
      ).pipe(
        Effect.annotateLogs({
          guildId: rule.guildId,
          ruleId: rule.id,
          world: rule.world ?? "all",
          unmatchedNpcIds: unmatched.npcIds.join(","),
          unmatchedTemplateIds: unmatched.templateIds.join(","),
        }),
      );
    }

    const timers = organizationTimers.filter((timer) =>
      matchesTimerRule(rule.filters, timerNpcIdentity(timer)),
    );

    if (timers.length === 0) return;

    const isPermitted = yield* permitted(rule);
    const now = new Date(yield* Clock.currentTimeMillis);

    const jobs = timers.flatMap((timer) => {
      const npc = Predicate.isObject(timer.npc) ? timer.npc : null;
      const schedule = timerSchedule(rule, { ...timer, npc }, now);

      return eligible.map(({ target }) => ({ target, schedule }));
    });

    yield* Effect.forEach(
      jobs,
      ({ target, schedule }) =>
        createTimerJob(rule, target, schedule, isPermitted),
      { concurrency: REBUILD_CONCURRENCY, discard: true },
    );
  });

  return { rebuildRule, rebuildTimer };
};

export type NotificationJobRebuild = ReturnType<
  typeof makeNotificationJobRebuild
>;
