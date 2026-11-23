import {
  OperationError,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import { selectNotificationJobsWithRelations } from "./notification-job-query.js";
import { readNotificationRuleTargets } from "#src/notifications/targets/notification-target.repository";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  notExists,
  sql,
} from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/notification.schema";
import { timerTable } from "#src/database/drizzle/timer.schema";
import type { JsonValue } from "#src/database/json";
import type {
  NotificationJobStatus,
  NotificationOwnerType,
} from "@lootlog/schema/notifications";

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

const eligibleJobForAttempt = (jobId: string, retrying: boolean) =>
  and(
    eq(notificationJobTable.id, jobId),
    inArray(
      notificationJobTable.status,
      retrying ? ["PENDING", "BLOCKED", "PROCESSING"] : ["PENDING", "BLOCKED"],
    ),
  );

export const makeNotificationJobStore = (database: ApiDatabaseValue) => {
  const failure = (operation: string) => (cause: unknown) =>
    new OperationError({ operation, cause });

  const findJob = (jobId: string) =>
    database
      .select()
      .from(notificationJobTable)
      .where(eq(notificationJobTable.id, jobId))
      .limit(1)
      .pipe(
        Effect.mapBoth({
          onFailure: failure("notifications.jobStore.findJob"),
          onSuccess: (rows) => rows[0] ?? null,
        }),
      );

  const findJobWithRelations = (jobId: string) =>
    selectNotificationJobsWithRelations(database)
      .where(eq(notificationJobTable.id, jobId))
      .limit(1)
      .pipe(
        Effect.mapBoth({
          onFailure: failure("notifications.jobStore.findWithRelations"),
          onSuccess: (rows): NotificationJobWithRelations | null => {
            const row = rows[0];

            return row
              ? {
                  ...row.job,
                  rule: row.rule,
                  target: row.target,
                }
              : null;
          },
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

  const claimJob = (jobId: string, retrying = false) =>
    database
      .update(notificationJobTable)
      .set({
        status: "PROCESSING",
        blockedReason: null,
        attemptCount: sql`${notificationJobTable.attemptCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eligibleJobForAttempt(jobId, retrying))
      .returning({ id: notificationJobTable.id })
      .pipe(
        Effect.mapBoth({
          onFailure: failure("notifications.jobStore.claim"),
          onSuccess: (rows) => rows.length > 0,
        }),
      );

  const failClaim = (
    jobId: string,
    attemptCount: number,
    values: Pick<
      typeof notificationJobTable.$inferInsert,
      "status" | "lastError" | "processedAt"
    >,
  ) =>
    database
      .update(notificationJobTable)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(notificationJobTable.id, jobId),
          inArray(notificationJobTable.status, ["PROCESSING", "PENDING"]),
          eq(notificationJobTable.attemptCount, attemptCount),
        ),
      )
      .returning({ id: notificationJobTable.id })
      .pipe(
        Effect.mapBoth({
          onFailure: failure("notifications.jobStore.failClaim"),
          onSuccess: (rows) => rows.length > 0,
        }),
      );

  const blockJob = (jobId: string, reason: string, retrying = false) =>
    database
      .update(notificationJobTable)
      .set({
        status: "BLOCKED",
        blockedReason: reason,
        lastError: reason,
        updatedAt: new Date(),
      })
      .where(eligibleJobForAttempt(jobId, retrying))
      .pipe(Effect.mapError(failure("notifications.jobStore.block")));

  const cancelJob = (jobId: string, reason: string, retrying = false) =>
    database
      .update(notificationJobTable)
      .set({
        status: "CANCELED",
        blockedReason: reason,
        lastError: reason,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eligibleJobForAttempt(jobId, retrying))
      .returning({ id: notificationJobTable.id })
      .pipe(
        Effect.mapBoth({
          onSuccess: (rows) => rows.length > 0,
          onFailure: failure("notifications.jobStore.cancel"),
        }),
      );

  const findOverdue = (before: Date, limit: number) =>
    database
      .select({
        id: notificationJobTable.id,
        ruleId: notificationJobTable.ruleId,
        ownerType: notificationJobTable.ownerType,
        ownerId: notificationJobTable.ownerId,
        sourceEntityType: notificationJobTable.sourceEntityType,
        scheduledFor: notificationJobTable.scheduledFor,
        maxSpawnTime: sql<
          string | null
        >`${notificationJobTable.payloadSnapshot}->>'maxSpawnTime'`,
      })
      .from(notificationJobTable)
      .where(
        and(
          eq(notificationJobTable.status, "PENDING"),
          lt(notificationJobTable.scheduledFor, before),
        ),
      )
      .orderBy(asc(notificationJobTable.scheduledFor))
      .limit(limit)
      .pipe(Effect.mapError(failure("notifications.jobStore.findOverdue")));

  const findStalledRecurringRules = (before: Date, limit: number) =>
    database
      .select({ id: notificationRuleTable.id })
      .from(notificationRuleTable)
      .where(
        and(
          eq(notificationRuleTable.enabled, true),
          isNotNull(notificationRuleTable.scheduleIntervalType),
          ne(notificationRuleTable.scheduleIntervalType, "ONCE"),
          lt(notificationRuleTable.scheduledAt, before),
          notExists(
            database
              .select({ id: notificationJobTable.id })
              .from(notificationJobTable)
              .where(
                and(
                  eq(notificationJobTable.ruleId, notificationRuleTable.id),
                  eq(
                    notificationJobTable.scheduledFor,
                    notificationRuleTable.scheduledAt,
                  ),
                  inArray(notificationJobTable.status, [
                    "PENDING",
                    "PROCESSING",
                    "BLOCKED",
                  ]),
                ),
              ),
          ),
        ),
      )
      .orderBy(asc(notificationRuleTable.scheduledAt))
      .limit(limit)
      .pipe(
        Effect.mapBoth({
          onSuccess: (rows) => rows.map(({ id }) => id),
          onFailure: failure(
            "notifications.jobStore.findStalledRecurringRules",
          ),
        }),
      );

  const closeMissed = (jobId: string, reason: string) =>
    Effect.gen(function* () {
      const now = new Date(yield* Clock.currentTimeMillis);

      return yield* database
        .update(notificationJobTable)
        .set({
          status: "FAILED",
          lastError: reason,
          processedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(notificationJobTable.id, jobId),
            eq(notificationJobTable.status, "PENDING"),
          ),
        )
        .returning({ id: notificationJobTable.id });
    }).pipe(
      Effect.mapBoth({
        onFailure: failure("notifications.jobStore.closeMissed"),
        onSuccess: (rows) => rows.length > 0,
      }),
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
        withAdapterSpan(
          "notifications.jobStore.recordDelivery.transaction",
          "notifications.drizzle",
        ),
      );

  const findRules = (ruleIds: readonly number[]) =>
    Effect.gen(function* () {
      if (ruleIds.length === 0) return [];

      const rules = yield* database
        .select()
        .from(notificationRuleTable)
        .where(inArray(notificationRuleTable.id, [...ruleIds]))
        .orderBy(asc(notificationRuleTable.id));

      if (rules.length === 0) return [];

      const targets = yield* readNotificationRuleTargets(
        database,
        rules.map(({ id }) => id),
      );

      return rules.map((rule): NotificationRuleWithTargets => ({
        ...rule,
        targets: [...(targets.get(rule.id) ?? [])],
      }));
    }).pipe(Effect.mapError(failure("notifications.jobStore.findRules")));

  const findRule = (ruleId: number) =>
    findRules([ruleId]).pipe(Effect.map((rules) => rules[0] ?? null));

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
        Effect.mapBoth({
          onFailure: failure("notifications.jobStore.advanceRule"),
          onSuccess: (rows) => rows.length > 0,
        }),
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
    blockJob,
    cancelJob,
    findStalledRecurringRules,
    claimJob,
    closeMissed,
    cycleStatuses,
    failClaim,
    findJob,
    findJobWithRelations,
    findOverdue,
    findRule,
    findRules,
    findTimers,
    prune,
    recordDelivery,
    updateJob,
  };
};

export type NotificationJobStore = ReturnType<typeof makeNotificationJobStore>;
