import {
  notificationApiKeyOrganizations,
  notificationRulesInApiKeyScope,
} from "../notification-api-key-scope.js";
import {
  deleteNotificationTargetAndOrphanedRules,
  mapNotificationTarget,
  readNotificationTargetRuleIds,
  readSingleTargetNotificationRuleIds,
  updateNotificationTarget,
} from "#src/notifications/targets/notification-target-store";
import {
  getNotificationTestUsageResponse,
  readNotificationTestUsage,
} from "../jobs/notification-test-usage.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import {
  InvalidRequestError,
  PermissionDeniedError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import {
  USER_DM_TEST_MESSAGE,
  USER_DM_TEST_RULE_NAME,
} from "#src/notifications/targets/user-dm";
import type {
  CreateNotificationTargetRequest,
  UpdateNotificationTargetRequest,
} from "#src/contracts/notifications/schemas";
import { Error as NotificationError } from "#src/notifications/error";
import type { JsonObject } from "#src/database/json";
import {
  NotificationJobKind,
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
} from "#src/notifications/notification-enums";

const TEST_LIMIT = 5;

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
                new ResourceNotFoundError(
                  NotificationError.NOTIFICATION_TARGET_NOT_FOUND,
                ),
              ),
        ),
      );

  const requireTargetScope = (targetId: number) =>
    Effect.gen(function* () {
      const organizations = yield* notificationApiKeyOrganizations(database);

      if (!organizations) return;
      const organizationIds = organizations.map((guild) => guild.id);

      const rules = yield* database
        .select({ rule: notificationRuleTable })
        .from(notificationRuleTargetTable)
        .innerJoin(
          notificationRuleTable,
          eq(notificationRuleTargetTable.ruleId, notificationRuleTable.id),
        )
        .where(eq(notificationRuleTargetTable.targetId, targetId));

      const allowed = yield* notificationRulesInApiKeyScope(
        database,
        rules.map(({ rule }) => rule),
        organizationIds,
      );

      if (allowed.length !== rules.length) {
        return yield* new PermissionDeniedError(
          "Notification target affects organizations outside the API key scope",
        );
      }
    });

  const recentUsage = (targetIds: number[]) =>
    readNotificationTestUsage(database, targetIds).pipe(
      Effect.mapError(databaseFailure("notifications.userTargets.testUsage")),
    );

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
      ...mapNotificationTarget(target),
      testTrigger: getNotificationTestUsageResponse(
        usage.get(target.id) ?? [],
        TEST_LIMIT,
      ),
    }));
  });

  const create = Effect.fn("notifications.userTargets.create")(function* (
    discordId: string,
    data: CreateNotificationTargetRequest,
  ) {
    if (data.targetType !== NotificationTargetType.DM) {
      return yield* Effect.fail(
        new InvalidRequestError(
          NotificationError.USER_TARGETS_MUST_BE_DISCORD_DMS,
        ),
      );
    }

    if (data.externalId && data.externalId !== discordId) {
      return yield* Effect.fail(
        new InvalidRequestError(
          NotificationError.USER_DM_TARGET_MUST_USE_AUTHENTICATED_DISCORD_ACCOUNT,
        ),
      );
    }

    const organizations = yield* notificationApiKeyOrganizations(database);

    if (organizations) {
      const existing = yield* database
        .select({ id: notificationTargetTable.id })
        .from(notificationTargetTable)
        .where(
          and(
            eq(notificationTargetTable.ownerType, NotificationOwnerType.USER),
            eq(notificationTargetTable.ownerId, discordId),
            eq(notificationTargetTable.targetType, NotificationTargetType.DM),
            eq(notificationTargetTable.externalId, discordId),
          ),
        )
        .limit(1);

      if (existing[0]) yield* requireTargetScope(existing[0].id);
    }

    const now = new Date(yield* Clock.currentTimeMillis);

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
            .select({
              ruleId: watchedItemTable.notificationRuleId,
              rule: notificationRuleTable,
            })
            .from(watchedItemTable)
            .innerJoin(
              notificationRuleTable,
              eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
            )
            .where(
              and(
                eq(watchedItemTable.userId, discordId),
                isNotNull(watchedItemTable.notificationRuleId),
              ),
            );

          const allowed = yield* notificationRulesInApiKeyScope(
            transaction,
            watchedRules.map(({ rule }) => rule),
            organizations?.map((guild) => guild.id),
          );

          const ruleIds = allowed.map(({ id }) => id);

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

    return mapNotificationTarget(target);
  });

  const update = Effect.fn("notifications.userTargets.update")(function* (
    discordId: string,
    targetId: number,
    data: UpdateNotificationTargetRequest,
  ) {
    yield* find(discordId, targetId);
    yield* requireTargetScope(targetId);

    const rows = yield* updateNotificationTarget(
      database,
      targetId,
      NotificationOwnerType.USER,
      discordId,
      data,
    ).pipe(
      Effect.mapError(databaseFailure("notifications.userTargets.update")),
    );

    return rows[0] ? mapNotificationTarget(rows[0]) : null;
  });

  const orphanedRules = (targetId: number) =>
    Effect.gen(function* () {
      const ruleIds = yield* readNotificationTargetRuleIds(database, targetId);

      return yield* readSingleTargetNotificationRuleIds(database, ruleIds);
    }).pipe(
      Effect.mapError(databaseFailure("notifications.userTargets.ruleUsage")),
    );

  const remove = Effect.fn("notifications.userTargets.delete")(function* (
    discordId: string,
    targetId: number,
  ) {
    yield* find(discordId, targetId);
    yield* requireTargetScope(targetId);
    const ruleIds = yield* orphanedRules(targetId);
    yield* jobs.cancel({ targetId });
    yield* Effect.forEach(ruleIds, (ruleId) => jobs.cancel({ ruleId }), {
      concurrency: "unbounded",
      discard: true,
    });
    yield* deleteNotificationTargetAndOrphanedRules(
      database,
      targetId,
      ruleIds,
    ).pipe(
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
            const now = new Date(yield* Clock.currentTimeMillis);

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
          new InvalidRequestError(
            NotificationError.USER_TEST_TARGET_MUST_BE_DISCORD_DM,
          ),
        );
      }

      if (!target.active || !target.canSend) {
        return yield* Effect.fail(
          new ResourceConflictError(
            NotificationError.USER_DISCORD_DM_TARGET_MUST_BE_ACTIVE_AND_CAN_SEND,
          ),
        );
      }

      const usage = getNotificationTestUsageResponse(
        (yield* recentUsage([targetId])).get(targetId) ?? [],
        TEST_LIMIT,
      );

      if (usage.remaining <= 0) {
        return yield* Effect.fail(
          new ResourceConflictError({
            message: NotificationError.USER_DM_TEST_TRIGGER_LIMIT_REACHED,
            limit: usage.limit,
            windowSeconds: usage.windowSeconds,
            nextAvailableAt: usage.nextAvailableAt,
          }),
        );
      }

      const rule = yield* getOrCreateTestRule(discordId, targetId);
      const scheduledFor = new Date(yield* Clock.currentTimeMillis);

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
          new ResourceConflictError(
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
