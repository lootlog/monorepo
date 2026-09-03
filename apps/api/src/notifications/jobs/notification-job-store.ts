import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  timerTable,
} from "#src/database/drizzle/schema";
import type { JsonValue } from "#src/notifications/notification-database.types";
import type {
  NotificationJobStatus,
  NotificationOwnerType,
} from "#src/notifications/notification-enums";

export type NotificationStoredJob = Omit<
  typeof notificationJobTable.$inferSelect,
  "payloadSnapshot"
> & { readonly payloadSnapshot: JsonValue };
export type NotificationStoredRule = Omit<
  typeof notificationRuleTable.$inferSelect,
  "filters"
> & { readonly filters: JsonValue | null };
export type NotificationStoredTarget = Omit<
  typeof notificationTargetTable.$inferSelect,
  "metadata"
> & { readonly metadata: JsonValue | null };
export type NotificationRuleWithTargets = NotificationStoredRule & {
  readonly targets: Array<{
    readonly ruleId: number;
    readonly targetId: number;
    readonly createdAt: Date;
    readonly target: NotificationStoredTarget;
  }>;
};
export type NotificationJobWithRelations = NotificationStoredJob & {
  readonly rule: NotificationStoredRule;
  readonly target: NotificationStoredTarget;
};
export type NotificationDeliveryUpdate = {
  readonly jobId: string;
  readonly targetId: number;
  readonly job: Partial<typeof notificationJobTable.$inferInsert>;
  readonly target: Partial<typeof notificationTargetTable.$inferInsert>;
  readonly targetFirst?: boolean;
};

export class NotificationJobStoreFailure extends TaggedErrorClass<NotificationJobStoreFailure>()(
  "NotificationJobStoreFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const mapJob = (
  job: typeof notificationJobTable.$inferSelect,
): NotificationStoredJob => ({
  ...job,
  payloadSnapshot: job.payloadSnapshot as JsonValue,
});
const mapRule = (
  rule: typeof notificationRuleTable.$inferSelect,
): NotificationStoredRule => ({
  ...rule,
  filters: rule.filters as JsonValue | null,
});
const mapTarget = (
  target: typeof notificationTargetTable.$inferSelect,
): NotificationStoredTarget => ({
  ...target,
  metadata: target.metadata as JsonValue | null,
});

export const makeNotificationJobStore = (database: ApiDatabaseValue) => {
  const failure = (operation: string) => (cause: unknown) =>
    new NotificationJobStoreFailure({ operation, cause });

  const findJob = (jobId: string) =>
    database
      .select()
      .from(notificationJobTable)
      .where(eq(notificationJobTable.id, jobId))
      .limit(1)
      .pipe(
        Effect.mapError(failure("notifications.jobStore.findJob")),
        Effect.map((rows) => (rows[0] ? mapJob(rows[0]) : null)),
      );

  const findJobWithRelations = (jobId: string) =>
    database
      .select({
        job: notificationJobTable,
        rule: notificationRuleTable,
        target: notificationTargetTable,
      })
      .from(notificationJobTable)
      .innerJoin(
        notificationRuleTable,
        eq(notificationJobTable.ruleId, notificationRuleTable.id),
      )
      .innerJoin(
        notificationTargetTable,
        eq(notificationJobTable.targetId, notificationTargetTable.id),
      )
      .where(eq(notificationJobTable.id, jobId))
      .limit(1)
      .pipe(
        Effect.mapError(failure("notifications.jobStore.findWithRelations")),
        Effect.map((rows): NotificationJobWithRelations | null => {
          const row = rows[0];
          return row
            ? {
                ...mapJob(row.job),
                rule: mapRule(row.rule),
                target: mapTarget(row.target),
              }
            : null;
        }),
      );

  const updateJob = (
    jobId: string,
    values: Partial<typeof notificationJobTable.$inferInsert>,
  ) =>
    database
      .update(notificationJobTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(notificationJobTable.id, jobId))
      .pipe(Effect.mapError(failure("notifications.jobStore.update")));

  const claimJob = (jobId: string) =>
    database
      .update(notificationJobTable)
      .set({
        status: "PROCESSING",
        blockedReason: null,
        attemptCount: sql`${notificationJobTable.attemptCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notificationJobTable.id, jobId),
          inArray(notificationJobTable.status, ["PENDING", "BLOCKED"]),
        ),
      )
      .returning({ id: notificationJobTable.id })
      .pipe(
        Effect.mapError(failure("notifications.jobStore.claim")),
        Effect.map((rows) => rows.length > 0),
      );

  const recordDelivery = (options: NotificationDeliveryUpdate) =>
    database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const target = transaction
            .update(notificationTargetTable)
            .set({
              ...options.target,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(notificationTargetTable.id, options.targetId));
          const job = transaction
            .update(notificationJobTable)
            .set({
              ...options.job,
              updatedAt: new Date(yield* Clock.currentTimeMillis),
            })
            .where(eq(notificationJobTable.id, options.jobId));
          if (options.targetFirst ?? true) {
            yield* target;
            yield* job;
          } else {
            yield* job;
            yield* target;
          }
        }),
      )
      .pipe(
        Effect.mapError(failure("notifications.jobStore.recordDelivery")),
        Effect.withSpan("notifications.jobStore.recordDelivery.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );

  const targetsForRule = (ruleId: number) =>
    database
      .select({
        link: notificationRuleTargetTable,
        target: notificationTargetTable,
      })
      .from(notificationRuleTargetTable)
      .innerJoin(
        notificationTargetTable,
        eq(notificationRuleTargetTable.targetId, notificationTargetTable.id),
      )
      .where(eq(notificationRuleTargetTable.ruleId, ruleId))
      .pipe(
        Effect.mapError(failure("notifications.jobStore.ruleTargets")),
        Effect.map((rows) =>
          rows.map(({ link, target }) => ({
            ...link,
            target: mapTarget(target),
          })),
        ),
      );

  const findRule = (ruleId: number) =>
    Effect.gen(function* () {
      const rows = yield* database
        .select()
        .from(notificationRuleTable)
        .where(eq(notificationRuleTable.id, ruleId))
        .limit(1);
      const rule = rows[0];
      if (!rule) return null;
      const targets = yield* targetsForRule(ruleId);
      return {
        ...mapRule(rule),
        targets,
      } satisfies NotificationRuleWithTargets;
    }).pipe(Effect.mapError(failure("notifications.jobStore.findRule")));

  const findTimers = (guildId: string, world: string | null) =>
    database
      .select({
        guildId: timerTable.guildId,
        world: timerTable.world,
        npcId: timerTable.npcId,
        timerKey: timerTable.timerKey,
        minSpawnTime: timerTable.minSpawnTime,
        maxSpawnTime: timerTable.maxSpawnTime,
        npc: timerTable.npc,
      })
      .from(timerTable)
      .where(
        and(
          eq(timerTable.guildId, guildId),
          isNull(timerTable.deletedAt),
          world ? eq(timerTable.world, world) : undefined,
        ),
      )
      .pipe(Effect.mapError(failure("notifications.jobStore.findTimers")));

  const cycleStatuses = (ruleId: number, scheduledFor: Date) =>
    database
      .select({ status: notificationJobTable.status })
      .from(notificationJobTable)
      .where(
        and(
          eq(notificationJobTable.ruleId, ruleId),
          eq(notificationJobTable.scheduledFor, scheduledFor),
          eq(notificationJobTable.sourceEntityType, "scheduled-message"),
        ),
      )
      .pipe(Effect.mapError(failure("notifications.jobStore.cycleStatuses")));

  const advanceRule = (ruleId: number, current: Date, next: Date) =>
    database
      .update(notificationRuleTable)
      .set({ scheduledAt: next, updatedAt: new Date() })
      .where(
        and(
          eq(notificationRuleTable.id, ruleId),
          eq(notificationRuleTable.scheduledAt, current),
        ),
      )
      .returning({ id: notificationRuleTable.id })
      .pipe(
        Effect.mapError(failure("notifications.jobStore.advanceRule")),
        Effect.map((rows) => rows.length > 0),
      );

  const prune = (
    ownerType: NotificationOwnerType,
    ownerId: string,
    statuses: readonly NotificationJobStatus[],
    offset: number,
  ) =>
    Effect.gen(function* () {
      const stale = yield* database
        .select({ id: notificationJobTable.id })
        .from(notificationJobTable)
        .where(
          and(
            eq(notificationJobTable.ownerType, ownerType),
            eq(notificationJobTable.ownerId, ownerId),
            inArray(notificationJobTable.status, [...statuses]),
          ),
        )
        .orderBy(desc(notificationJobTable.updatedAt))
        .offset(offset);
      if (stale.length === 0) return;
      yield* database.delete(notificationJobTable).where(
        inArray(
          notificationJobTable.id,
          stale.map(({ id }) => id),
        ),
      );
    }).pipe(Effect.mapError(failure("notifications.jobStore.prune")));

  return {
    advanceRule,
    claimJob,
    cycleStatuses,
    findJob,
    findJobWithRelations,
    findRule,
    findTimers,
    prune,
    recordDelivery,
    updateJob,
  };
};

export type NotificationJobStore = ReturnType<typeof makeNotificationJobStore>;
