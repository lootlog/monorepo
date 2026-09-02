import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  guildTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { NotificationFiltersResponseDto } from "./dto/notification-response.dto.js";
import type { JsonObject, JsonValue } from "./notification-database.types.js";
import type { CreateNotificationRuleDto } from "./dto/create-notification-rule.dto.js";
import type { UpdateNotificationRuleDto } from "./dto/update-notification-rule.dto.js";
import { Error as NotificationError } from "./enum/error.enum.js";
import {
  NotificationJobKind,
  NotificationOwnerType,
  type NotificationOwnerType as NotificationOwnerTypeValue,
} from "./notification-enums.js";
import {
  createNotificationRuleValues,
  updateNotificationRuleValues,
} from "./notification-rule-policy.js";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "#src/shared/http/http-errors";

const TEST_LIMIT = 10;
const TEST_WINDOW_MS = 15 * 60_000;
const MAX_NPCS_PER_RULE = 5;
const USER_RULE_LIMIT = 50;

export interface NotificationRuleDependencies {
  readonly ensureGuildPermissions: (
    guildId: string,
  ) => Effect.Effect<unknown, unknown, never>;
  readonly rebuildJobs: (
    ruleId: number,
  ) => Effect.Effect<unknown, unknown, never>;
  readonly cancelJobs: (filters: {
    readonly ruleId: number;
  }) => Effect.Effect<unknown, unknown, never>;
  readonly buildTestPayload: (options: {
    readonly notificationRule: typeof notificationRuleTable.$inferSelect;
    readonly scheduledFor: Date;
    readonly targetType: typeof notificationTargetTable.$inferSelect.targetType;
  }) => Effect.Effect<JsonObject, unknown, never>;
  readonly createTestJob: (options: {
    readonly notificationRule: typeof notificationRuleTable.$inferSelect;
    readonly target: typeof notificationTargetTable.$inferSelect;
    readonly jobKind: typeof NotificationJobKind.TEST;
    readonly scheduledFor: Date;
    readonly sourceEntityType: "rule-test";
    readonly sourceEntityId: string;
    readonly sourceEventId: string;
    readonly payloadSnapshot: JsonObject;
  }) => Effect.Effect<{ readonly id: string } | null, unknown, never>;
  readonly enqueueJob: (
    jobId: string,
    delay: number,
  ) => Effect.Effect<unknown, unknown, never>;
}

export class NotificationRuleOperationFailure extends TaggedErrorClass<NotificationRuleOperationFailure>()(
  "NotificationRuleOperationFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeNotificationRuleOperations = (
  database: ApiDatabaseValue,
  dependencies: NotificationRuleDependencies,
) => {
  const loadRules = (ownerType: NotificationOwnerTypeValue, ownerId: string) =>
    Effect.gen(function* () {
      const ruleRows = yield* database
        .select()
        .from(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.ownerType, ownerType),
            eq(notificationRuleTable.ownerId, ownerId),
          ),
        )
        .orderBy(
          desc(notificationRuleTable.enabled),
          desc(notificationRuleTable.updatedAt),
        );
      const ruleIds = ruleRows.map(({ id }) => id);
      const links =
        ruleIds.length === 0
          ? []
          : yield* database
              .select({
                link: notificationRuleTargetTable,
                target: notificationTargetTable,
              })
              .from(notificationRuleTargetTable)
              .innerJoin(
                notificationTargetTable,
                eq(
                  notificationRuleTargetTable.targetId,
                  notificationTargetTable.id,
                ),
              )
              .where(inArray(notificationRuleTargetTable.ruleId, ruleIds));
      const targetsByRule = new Map<number, typeof links>();
      for (const link of links) {
        const targets = targetsByRule.get(link.link.ruleId) ?? [];
        targets.push(link);
        targetsByRule.set(link.link.ruleId, targets);
      }
      return ruleRows.map((rule) => ({
        ...rule,
        filters:
          rule.filters === null
            ? null
            : NotificationFiltersResponseDto.schema.parse(rule.filters),
        targets: (targetsByRule.get(rule.id) ?? []).map(({ link, target }) => ({
          ...link,
          target: {
            ...target,
            metadata: target.metadata as JsonValue | null,
          },
        })),
      }));
    }).pipe(
      Effect.mapError(
        (cause) =>
          new NotificationRuleOperationFailure({
            operation: "notifications.rules.list",
            cause,
          }),
      ),
    );

  const testUsage = (targetIds: number[]) =>
    Effect.gen(function* () {
      if (targetIds.length === 0) return new Map<number, Date[]>();
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
            gte(
              notificationJobTable.createdAt,
              new Date(Date.now() - TEST_WINDOW_MS),
            ),
          ),
        )
        .orderBy(asc(notificationJobTable.createdAt));
      const usage = new Map<number, Date[]>();
      for (const row of rows) {
        const values = usage.get(row.targetId) ?? [];
        values.push(row.createdAt);
        usage.set(row.targetId, values);
      }
      return usage;
    }).pipe(
      Effect.mapError(
        (cause) =>
          new NotificationRuleOperationFailure({
            operation: "notifications.rules.testUsage",
            cause,
          }),
      ),
    );

  const usageResponse = (targetIds: number[], usage: Map<number, Date[]>) => {
    const worst = targetIds.reduce<readonly Date[]>((current, targetId) => {
      const candidate = usage.get(targetId) ?? [];
      return candidate.length > current.length ? candidate : current;
    }, []);
    const used = worst.length;
    const oldest = worst[0];
    return {
      limit: TEST_LIMIT,
      used,
      remaining: Math.max(0, TEST_LIMIT - used),
      windowSeconds: Math.floor(TEST_WINDOW_MS / 1000),
      nextAvailableAt:
        used >= TEST_LIMIT && oldest
          ? new Date(oldest.getTime() + TEST_WINDOW_MS).toISOString()
          : null,
    };
  };

  const listGuild = Effect.fn("notifications.rules.listGuild")(function* (
    guildId: string,
  ) {
    const [loadedRules, guildRows, counts] = yield* Effect.all(
      [
        loadRules(NotificationOwnerType.GUILD, guildId),
        database
          .select({ notificationRuleLimit: guildTable.notificationRuleLimit })
          .from(guildTable)
          .where(eq(guildTable.id, guildId))
          .limit(1),
        database
          .select({ value: count() })
          .from(notificationRuleTable)
          .where(
            and(
              eq(notificationRuleTable.ownerType, NotificationOwnerType.GUILD),
              eq(notificationRuleTable.ownerId, guildId),
            ),
          ),
      ],
      { concurrency: 3 },
    );
    const targetIds = [
      ...new Set(
        loadedRules.flatMap((rule) =>
          rule.targets.map(({ target }) => target.id),
        ),
      ),
    ];
    const usage = yield* testUsage(targetIds);
    return {
      items: loadedRules.map((rule) => ({
        ...rule,
        testTrigger: usageResponse(
          rule.targets.map(({ target }) => target.id),
          usage,
        ),
      })),
      limits: {
        ruleLimit: guildRows[0]?.notificationRuleLimit ?? 20,
        ruleCount: counts[0]?.value ?? loadedRules.length,
        maxNpcsPerRule: MAX_NPCS_PER_RULE,
        testTriggerLimit: TEST_LIMIT,
        testTriggerWindowSeconds: Math.floor(TEST_WINDOW_MS / 1000),
      },
    };
  });

  const findRule = (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    ruleId: number,
  ) =>
    database
      .select()
      .from(notificationRuleTable)
      .where(
        and(
          eq(notificationRuleTable.id, ruleId),
          eq(notificationRuleTable.ownerType, ownerType),
          eq(notificationRuleTable.ownerId, ownerId),
        ),
      )
      .limit(1)
      .pipe(
        Effect.mapError(
          (cause) =>
            new NotificationRuleOperationFailure({
              operation: "notifications.rules.find",
              cause,
            }),
        ),
        Effect.flatMap((rows) =>
          rows[0]
            ? Effect.succeed(rows[0])
            : Effect.fail(
                new NotFoundException(
                  NotificationError.NOTIFICATION_RULE_NOT_FOUND,
                ),
              ),
        ),
      );

  const loadRule = (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    ruleId: number,
  ) =>
    loadRules(ownerType, ownerId).pipe(
      Effect.flatMap((rules) => {
        const rule = rules.find((candidate) => candidate.id === ruleId);
        return rule
          ? Effect.succeed(rule)
          : Effect.fail(
              new NotFoundException(
                NotificationError.NOTIFICATION_RULE_NOT_FOUND,
              ),
            );
      }),
    );

  const validateTargetIds = (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    targetIds: readonly number[],
  ) =>
    Effect.gen(function* () {
      if (targetIds.length === 0) {
        return yield* Effect.fail(
          new BadRequestException(
            NotificationError.AT_LEAST_ONE_TARGET_REQUIRED,
          ),
        );
      }
      const rows = yield* database
        .select({ id: notificationTargetTable.id })
        .from(notificationTargetTable)
        .where(
          and(
            inArray(notificationTargetTable.id, [...targetIds]),
            eq(notificationTargetTable.ownerType, ownerType),
            eq(notificationTargetTable.ownerId, ownerId),
            eq(notificationTargetTable.active, true),
          ),
        );
      if (rows.length !== targetIds.length) {
        return yield* Effect.fail(
          new BadRequestException(
            NotificationError.INVALID_NOTIFICATION_TARGETS,
          ),
        );
      }
      return [...targetIds];
    }).pipe(
      Effect.mapError((cause) =>
        cause instanceof BadRequestException
          ? cause
          : new NotificationRuleOperationFailure({
              operation: "notifications.rules.validateTargets",
              cause,
            }),
      ),
    );

  const ensureRuleLimit = (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
  ) =>
    Effect.gen(function* () {
      const counts = yield* database
        .select({ value: count() })
        .from(notificationRuleTable)
        .where(
          and(
            eq(notificationRuleTable.ownerType, ownerType),
            eq(notificationRuleTable.ownerId, ownerId),
          ),
        );
      const ruleCount = counts[0]?.value ?? 0;
      if (ownerType === NotificationOwnerType.USER) {
        if (ruleCount >= USER_RULE_LIMIT) {
          return yield* Effect.fail(
            new ConflictException({
              message: NotificationError.USER_NOTIFICATION_RULE_LIMIT_REACHED,
              ruleLimit: USER_RULE_LIMIT,
              ruleCount,
            }),
          );
        }
        return;
      }
      const guilds = yield* database
        .select({ notificationRuleLimit: guildTable.notificationRuleLimit })
        .from(guildTable)
        .where(eq(guildTable.id, ownerId))
        .limit(1);
      const guild = guilds[0];
      if (!guild) {
        return yield* Effect.fail(
          new NotFoundException(NotificationError.GUILD_NOT_FOUND),
        );
      }
      if (ruleCount >= guild.notificationRuleLimit) {
        return yield* Effect.fail(
          new ConflictException({
            message: NotificationError.GUILD_NOTIFICATION_RULE_LIMIT_REACHED,
            ruleLimit: guild.notificationRuleLimit,
            ruleCount,
          }),
        );
      }
    });

  const create = Effect.fn("notifications.rules.create")(function* (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    data: CreateNotificationRuleDto,
  ) {
    yield* ensureRuleLimit(ownerType, ownerId);
    const targetIds = yield* validateTargetIds(
      ownerType,
      ownerId,
      data.targetIds,
    );
    const values = yield* Effect.try({
      try: () => createNotificationRuleValues(ownerType, ownerId, data),
      catch: (cause) => cause,
    });
    const now = new Date();
    const rule = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const rows = yield* transaction
          .insert(notificationRuleTable)
          .values({ ...values, createdAt: now, updatedAt: now })
          .returning();
        const created = rows[0];
        if (!created) return yield* Effect.die("Rule insert returned no row");
        yield* transaction
          .insert(notificationRuleTargetTable)
          .values(
            targetIds.map((targetId) => ({ ruleId: created.id, targetId })),
          )
          .onConflictDoNothing();
        return created;
      }),
    );
    if (ownerType === NotificationOwnerType.GUILD) {
      yield* dependencies.rebuildJobs(rule.id);
    }
    return yield* loadRule(ownerType, ownerId, rule.id);
  });

  const update = Effect.fn("notifications.rules.update")(function* (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    const existing = yield* findRule(ownerType, ownerId, ruleId);
    const targetIds = data.targetIds
      ? yield* validateTargetIds(ownerType, ownerId, data.targetIds)
      : null;
    const values = yield* Effect.try({
      try: () => updateNotificationRuleValues(ownerType, existing, data),
      catch: (cause) => cause,
    });
    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        yield* transaction
          .update(notificationRuleTable)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(notificationRuleTable.id, ruleId));
        if (targetIds) {
          yield* transaction
            .delete(notificationRuleTargetTable)
            .where(eq(notificationRuleTargetTable.ruleId, ruleId));
          yield* transaction
            .insert(notificationRuleTargetTable)
            .values(targetIds.map((targetId) => ({ ruleId, targetId })))
            .onConflictDoNothing();
        }
      }),
    );
    if (ownerType === NotificationOwnerType.GUILD) {
      yield* dependencies.rebuildJobs(ruleId);
    }
    return yield* loadRule(ownerType, ownerId, ruleId);
  });

  const remove = Effect.fn("notifications.rules.delete")(function* (
    ownerType: NotificationOwnerTypeValue,
    ownerId: string,
    ruleId: number,
  ) {
    yield* findRule(ownerType, ownerId, ruleId);
    yield* dependencies.cancelJobs({ ruleId });
    yield* database
      .delete(notificationRuleTable)
      .where(eq(notificationRuleTable.id, ruleId));
    return { success: true as const };
  });

  const testGuild = Effect.fn("notifications.rules.testGuild")(function* (
    guildId: string,
    ruleId: number,
  ) {
    yield* dependencies.ensureGuildPermissions(guildId);
    const rules = yield* loadRules(NotificationOwnerType.GUILD, guildId);
    const rule = rules.find((candidate) => candidate.id === ruleId);
    if (!rule) {
      return yield* Effect.fail(
        new NotFoundException(NotificationError.NOTIFICATION_RULE_NOT_FOUND),
      );
    }
    if (!rule.enabled) {
      return yield* Effect.fail(
        new ConflictException(
          NotificationError.ONLY_ENABLED_RULES_CAN_BE_TEST_TRIGGERED,
        ),
      );
    }
    const activeTargets = rule.targets
      .map(({ target }) => target)
      .filter((target) => target.active && target.canSend);
    if (activeTargets.length === 0) {
      return yield* Effect.fail(
        new ConflictException(
          NotificationError.NOTIFICATION_RULE_REQUIRES_ACTIVE_SENDABLE_TARGET,
        ),
      );
    }
    const usage = yield* testUsage(activeTargets.map(({ id }) => id));
    const sendableTargets = activeTargets.filter(
      ({ id }) => (usage.get(id)?.length ?? 0) < TEST_LIMIT,
    );
    if (sendableTargets.length === 0) {
      const worst = usageResponse(
        activeTargets.map(({ id }) => id),
        usage,
      );
      return yield* Effect.fail(
        new ConflictException({
          message: NotificationError.TEST_TRIGGER_LIMIT_REACHED_FOR_RULE,
          limit: worst.limit,
          windowSeconds: worst.windowSeconds,
          nextAvailableAt: worst.nextAvailableAt,
        }),
      );
    }
    const scheduledFor = new Date();
    const sourceEventId = `test:${rule.id}:${randomUUID()}`;
    const jobs = yield* Effect.forEach(
      sendableTargets,
      (target) =>
        dependencies
          .buildTestPayload({
            notificationRule: rule,
            scheduledFor,
            targetType: target.targetType,
          })
          .pipe(
            Effect.flatMap((payload) =>
              dependencies.createTestJob({
                notificationRule: rule,
                target,
                jobKind: NotificationJobKind.TEST,
                scheduledFor,
                sourceEntityType: "rule-test",
                sourceEntityId: String(rule.id),
                sourceEventId,
                payloadSnapshot: {
                  ...payload,
                  testTriggeredAt: scheduledFor.toISOString(),
                  source: "rule-test",
                },
              }),
            ),
          ),
      { concurrency: "unbounded" },
    );
    const created = jobs.filter(
      (job): job is { readonly id: string } => job !== null,
    );
    yield* Effect.forEach(created, ({ id }) => dependencies.enqueueJob(id, 0), {
      concurrency: "unbounded",
      discard: true,
    });
    if (created.length === 0) {
      return yield* Effect.fail(
        new ConflictException(NotificationError.NO_TEST_JOBS_CREATED_FOR_RULE),
      );
    }
    return { success: true as const };
  });

  return {
    createGuild: (guildId: string, data: CreateNotificationRuleDto) =>
      dependencies
        .ensureGuildPermissions(guildId)
        .pipe(
          Effect.flatMap(() =>
            create(NotificationOwnerType.GUILD, guildId, data),
          ),
        ),
    createUser: (discordId: string, data: CreateNotificationRuleDto) =>
      create(NotificationOwnerType.USER, discordId, data),
    deleteGuild: (guildId: string, ruleId: number) =>
      remove(NotificationOwnerType.GUILD, guildId, ruleId),
    deleteUser: (discordId: string, ruleId: number) =>
      remove(NotificationOwnerType.USER, discordId, ruleId),
    listGuild,
    listUser: (discordId: string) =>
      loadRules(NotificationOwnerType.USER, discordId).pipe(
        Effect.withSpan("notifications.rules.listUser"),
      ),
    rebuildGuildJobs: (guildId: string, ruleId: number) =>
      findRule(NotificationOwnerType.GUILD, guildId, ruleId).pipe(
        Effect.flatMap(() => dependencies.rebuildJobs(ruleId)),
        Effect.as({ success: true as const }),
      ),
    testGuild,
    updateGuild: (
      guildId: string,
      ruleId: number,
      data: UpdateNotificationRuleDto,
    ) =>
      dependencies
        .ensureGuildPermissions(guildId)
        .pipe(
          Effect.flatMap(() =>
            update(NotificationOwnerType.GUILD, guildId, ruleId, data),
          ),
        ),
    updateUser: (
      discordId: string,
      ruleId: number,
      data: UpdateNotificationRuleDto,
    ) => update(NotificationOwnerType.USER, discordId, ruleId, data),
  };
};

export type NotificationRuleOperations = ReturnType<
  typeof makeNotificationRuleOperations
>;
