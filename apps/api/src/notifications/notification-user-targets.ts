import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { hasOwnField } from "#src/shared/utils/has-own-field";
import {
  USER_DM_TEST_MESSAGE,
  USER_DM_TEST_RULE_NAME,
} from "./constants/user-dm.constant.js";
import type { CreateNotificationTargetDto } from "./dto/create-notification-target.dto.js";
import type { UpdateNotificationTargetDto } from "./dto/update-notification-target.dto.js";
import { Error as NotificationError } from "./enum/error.enum.js";
import type { JsonObject, JsonValue } from "./notification-database.types.js";
import {
  NotificationJobKind,
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
} from "./notification-enums.js";

const TEST_LIMIT = 5;
const TEST_WINDOW_MS = 15 * 60_000;

type Rule = typeof notificationRuleTable.$inferSelect;
type Target = typeof notificationTargetTable.$inferSelect;

export interface NotificationUserTargetJobs {
  readonly cancel: (filters: {
    readonly targetId?: number;
    readonly ruleId?: number;
  }) => Effect.Effect<unknown, unknown>;
  readonly create: (options: {
    readonly notificationRule: Pick<
      Rule,
      "id" | "ownerType" | "ownerId" | "guildId" | "triggerType"
    >;
    readonly target: Pick<
      Target,
      "id" | "externalId" | "targetType" | "active" | "canSend"
    >;
    readonly jobKind: "TEST";
    readonly scheduledFor: Date;
    readonly sourceEntityType: string;
    readonly sourceEntityId: string;
    readonly payloadSnapshot: JsonObject;
  }) => Effect.Effect<{ readonly id: string } | null, unknown>;
  readonly enqueue: (
    notificationJobId: string,
    delayMs: number,
  ) => Effect.Effect<void, unknown>;
}

export class NotificationUserTargetFailure extends TaggedErrorClass<NotificationUserTargetFailure>()(
  "NotificationUserTargetFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const mapTarget = (target: Target) => ({
  ...target,
  metadata: target.metadata as JsonValue | null,
});

export const makeNotificationUserTargets = (
  database: ApiDatabaseValue,
  jobs: NotificationUserTargetJobs,
) => {
  const databaseFailure = (operation: string) => (cause: unknown) =>
    new NotificationUserTargetFailure({ operation, cause });

  const find = (discordId: string, targetId: number) =>
    database
      .select()
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.id, targetId),
          eq(notificationTargetTable.ownerType, NotificationOwnerType.USER),
          eq(notificationTargetTable.ownerId, discordId),
        ),
      )
      .limit(1)
      .pipe(
        Effect.mapError(databaseFailure("notifications.userTargets.find")),
        Effect.flatMap((rows) =>
          rows[0]
            ? Effect.succeed(rows[0])
            : Effect.fail(
                new NotFoundException(
                  NotificationError.NOTIFICATION_TARGET_NOT_FOUND,
                ),
              ),
        ),
      );

  const recentUsage = (targetIds: number[]) =>
    Effect.gen(function* () {
      if (targetIds.length === 0) return new Map<number, Date[]>();
      const threshold = new Date(Date.now() - TEST_WINDOW_MS);
      const rows = yield* database
        .select({
          targetId: notificationJobTable.targetId,
          createdAt: notificationJobTable.createdAt,
        })
        .from(notificationJobTable)
        .where(
          and(
            inArray(notificationJobTable.targetId, targetIds),
            eq(notificationJobTable.jobKind, NotificationJobKind.TEST),
            gte(notificationJobTable.createdAt, threshold),
          ),
        )
        .orderBy(asc(notificationJobTable.createdAt))
        .pipe(
          Effect.mapError(
            databaseFailure("notifications.userTargets.testUsage"),
          ),
        );
      const usage = new Map<number, Date[]>();
      for (const row of rows) {
        const values = usage.get(row.targetId) ?? [];
        values.push(row.createdAt);
        usage.set(row.targetId, values);
      }
      return usage;
    });

  const usageResponse = (usage: readonly Date[]) => ({
    limit: TEST_LIMIT,
    used: usage.length,
    remaining: Math.max(0, TEST_LIMIT - usage.length),
    windowSeconds: Math.floor(TEST_WINDOW_MS / 1000),
    nextAvailableAt:
      usage.length >= TEST_LIMIT && usage[0]
        ? new Date(usage[0].getTime() + TEST_WINDOW_MS).toISOString()
        : null,
  });

  const list = Effect.fn("notifications.userTargets.list")(function* (
    discordId: string,
  ) {
    const targets = yield* database
      .select()
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.ownerType, NotificationOwnerType.USER),
          eq(notificationTargetTable.ownerId, discordId),
        ),
      )
      .orderBy(
        desc(notificationTargetTable.active),
        desc(notificationTargetTable.updatedAt),
      )
      .pipe(Effect.mapError(databaseFailure("notifications.userTargets.list")));
    const usage = yield* recentUsage(targets.map(({ id }) => id));
    return targets.map((target) => ({
      ...mapTarget(target),
      testTrigger: usageResponse(usage.get(target.id) ?? []),
    }));
  });

  const create = Effect.fn("notifications.userTargets.create")(function* (
    discordId: string,
    data: CreateNotificationTargetDto,
  ) {
    if (data.targetType !== NotificationTargetType.DM) {
      return yield* Effect.fail(
        new BadRequestException(
          NotificationError.USER_TARGETS_MUST_BE_DISCORD_DMS,
        ),
      );
    }
    if (data.externalId && data.externalId !== discordId) {
      return yield* Effect.fail(
        new BadRequestException(
          NotificationError.USER_DM_TARGET_MUST_USE_AUTHENTICATED_DISCORD_ACCOUNT,
        ),
      );
    }
    const now = new Date();
    const target = yield* database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const rows = yield* transaction
            .insert(notificationTargetTable)
            .values({
              ownerType: NotificationOwnerType.USER,
              ownerId: discordId,
              provider: NotificationProvider.DISCORD,
              targetType: NotificationTargetType.DM,
              externalId: discordId,
              displayName: data.displayName ?? "Discord DM",
              active: true,
              canSend: true,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                notificationTargetTable.ownerType,
                notificationTargetTable.ownerId,
                notificationTargetTable.provider,
                notificationTargetTable.targetType,
                notificationTargetTable.externalId,
              ],
              set: {
                displayName: data.displayName ?? "Discord DM",
                active: true,
                canSend: true,
                updatedAt: now,
              },
            })
            .returning();
          const created = rows[0];
          if (!created) return yield* Effect.fail("target-not-returned");
          const watchedRules = yield* transaction
            .select({ ruleId: watchedItemTable.notificationRuleId })
            .from(watchedItemTable)
            .where(
              and(
                eq(watchedItemTable.userId, discordId),
                isNotNull(watchedItemTable.notificationRuleId),
              ),
            );
          const ruleIds = watchedRules.flatMap(({ ruleId }) =>
            ruleId === null ? [] : [ruleId],
          );
          if (ruleIds.length > 0) {
            yield* transaction
              .insert(notificationRuleTargetTable)
              .values(
                ruleIds.map((ruleId) => ({ ruleId, targetId: created.id })),
              )
              .onConflictDoNothing();
          }
          return created;
        }),
      )
      .pipe(
        Effect.mapError(databaseFailure("notifications.userTargets.create")),
        Effect.withSpan("notifications.userTargets.create.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );
    return mapTarget(target);
  });

  const update = Effect.fn("notifications.userTargets.update")(function* (
    discordId: string,
    targetId: number,
    data: UpdateNotificationTargetDto,
  ) {
    yield* find(discordId, targetId);
    const displayName = hasOwnField(data, "displayName")
      ? { displayName: data.displayName ?? null }
      : {};
    const rows = yield* database
      .update(notificationTargetTable)
      .set({ ...displayName, active: data.active, updatedAt: new Date() })
      .where(
        and(
          eq(notificationTargetTable.id, targetId),
          eq(notificationTargetTable.ownerType, NotificationOwnerType.USER),
          eq(notificationTargetTable.ownerId, discordId),
        ),
      )
      .returning()
      .pipe(
        Effect.mapError(databaseFailure("notifications.userTargets.update")),
      );
    return rows[0] ? mapTarget(rows[0]) : null;
  });

  const orphanedRules = (targetId: number) =>
    Effect.gen(function* () {
      const links = yield* database
        .select({ ruleId: notificationRuleTargetTable.ruleId })
        .from(notificationRuleTargetTable)
        .where(eq(notificationRuleTargetTable.targetId, targetId));
      const ruleIds = links.map(({ ruleId }) => ruleId);
      if (ruleIds.length === 0) return [];
      const counts = yield* database
        .select({ ruleId: notificationRuleTargetTable.ruleId, value: count() })
        .from(notificationRuleTargetTable)
        .where(inArray(notificationRuleTargetTable.ruleId, ruleIds))
        .groupBy(notificationRuleTargetTable.ruleId);
      return counts
        .filter(({ value }) => value === 1)
        .map(({ ruleId }) => ruleId);
    }).pipe(
      Effect.mapError(databaseFailure("notifications.userTargets.ruleUsage")),
    );

  const remove = Effect.fn("notifications.userTargets.delete")(function* (
    discordId: string,
    targetId: number,
  ) {
    yield* find(discordId, targetId);
    const ruleIds = yield* orphanedRules(targetId);
    yield* jobs.cancel({ targetId });
    yield* Effect.forEach(ruleIds, (ruleId) => jobs.cancel({ ruleId }), {
      concurrency: "unbounded",
      discard: true,
    });
    yield* database
      .transaction((transaction) =>
        Effect.gen(function* () {
          yield* transaction
            .delete(notificationTargetTable)
            .where(eq(notificationTargetTable.id, targetId));
          if (ruleIds.length > 0) {
            yield* transaction
              .delete(notificationRuleTable)
              .where(inArray(notificationRuleTable.id, ruleIds));
          }
        }),
      )
      .pipe(
        Effect.mapError(databaseFailure("notifications.userTargets.delete")),
        Effect.withSpan("notifications.userTargets.delete.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );
    return { success: true as const };
  });

  const getOrCreateTestRule = (discordId: string, targetId: number) =>
    database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const existing = yield* transaction
            .select()
            .from(notificationRuleTable)
            .where(
              and(
                eq(notificationRuleTable.ownerType, NotificationOwnerType.USER),
                eq(notificationRuleTable.ownerId, discordId),
                eq(notificationRuleTable.triggerType, "SCHEDULED_MESSAGE"),
                eq(notificationRuleTable.name, USER_DM_TEST_RULE_NAME),
              ),
            )
            .limit(1);
          let rule = existing[0];
          if (!rule) {
            const now = new Date();
            const rows = yield* transaction
              .insert(notificationRuleTable)
              .values({
                ownerType: NotificationOwnerType.USER,
                ownerId: discordId,
                triggerType: "SCHEDULED_MESSAGE",
                name: USER_DM_TEST_RULE_NAME,
                filters: null,
                scheduleStrategy: "FIXED_DATETIME",
                scheduleIntervalType: "ONCE",
                enabled: false,
                dedupeWindowSeconds: 0,
                createdAt: now,
                updatedAt: now,
              })
              .returning();
            rule = rows[0];
          }
          if (!rule) return yield* Effect.fail("rule-not-returned");
          yield* transaction
            .insert(notificationRuleTargetTable)
            .values({ ruleId: rule.id, targetId })
            .onConflictDoNothing();
          return rule;
        }),
      )
      .pipe(
        Effect.mapError(databaseFailure("notifications.userTargets.testRule")),
        Effect.withSpan("notifications.userTargets.testRule.transaction", {
          attributes: { adapter: "notifications.drizzle", retryCount: 0 },
        }),
      );

  const triggerTest = Effect.fn("notifications.userTargets.triggerTest")(
    function* (discordId: string, targetId: number) {
      const target = yield* find(discordId, targetId);
      if (target.targetType !== NotificationTargetType.DM) {
        return yield* Effect.fail(
          new BadRequestException(
            NotificationError.USER_TEST_TARGET_MUST_BE_DISCORD_DM,
          ),
        );
      }
      if (!target.active || !target.canSend) {
        return yield* Effect.fail(
          new ConflictException(
            NotificationError.USER_DISCORD_DM_TARGET_MUST_BE_ACTIVE_AND_CAN_SEND,
          ),
        );
      }
      const usage = usageResponse(
        (yield* recentUsage([targetId])).get(targetId) ?? [],
      );
      if (usage.remaining <= 0) {
        return yield* Effect.fail(
          new ConflictException({
            message: NotificationError.USER_DM_TEST_TRIGGER_LIMIT_REACHED,
            limit: usage.limit,
            windowSeconds: usage.windowSeconds,
            nextAvailableAt: usage.nextAvailableAt,
          }),
        );
      }
      const rule = yield* getOrCreateTestRule(discordId, targetId);
      const scheduledFor = new Date();
      const job = yield* jobs.create({
        notificationRule: rule,
        target,
        jobKind: NotificationJobKind.TEST,
        scheduledFor,
        sourceEntityType: "user-dm-test",
        sourceEntityId: String(target.id),
        payloadSnapshot: {
          title: "Powiadomienie testowe",
          message: USER_DM_TEST_MESSAGE,
          content: USER_DM_TEST_MESSAGE,
          source: "user-dm-test",
          testTriggeredAt: scheduledFor.toISOString(),
        },
      });
      if (!job) {
        return yield* Effect.fail(
          new ConflictException(
            NotificationError.NO_TEST_JOB_CREATED_FOR_TARGET,
          ),
        );
      }
      yield* jobs.enqueue(job.id, 0);
      return { success: true as const };
    },
  );

  return { create, list, remove, triggerTest, update };
};

export type NotificationUserTargets = ReturnType<
  typeof makeNotificationUserTargets
>;
