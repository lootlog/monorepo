import { and, count, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";

import type { NotificationOwnerType } from "#src/notifications/notification-enums";
import type { UpdateNotificationTargetRequest } from "#src/contracts/notifications/schemas";

export const mapNotificationTarget = (
  target: typeof notificationTargetTable.$inferSelect,
) => ({
  ...target,
  metadata: target.metadata,
});

export const readNotificationRuleTargets = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  ruleIds: readonly number[],
) {
  const result = new Map<
    number,
    Array<
      typeof notificationRuleTargetTable.$inferSelect & {
        target: ReturnType<typeof mapNotificationTarget>;
      }
    >
  >();

  if (ruleIds.length === 0) return result;

  const rows = yield* database
    .select({
      link: notificationRuleTargetTable,
      target: notificationTargetTable,
    })
    .from(notificationRuleTargetTable)
    .innerJoin(
      notificationTargetTable,
      eq(notificationRuleTargetTable.targetId, notificationTargetTable.id),
    )
    .where(inArray(notificationRuleTargetTable.ruleId, ruleIds));

  for (const { link, target } of rows) {
    const targets = result.get(link.ruleId) ?? [];
    targets.push({ ...link, target: mapNotificationTarget(target) });
    result.set(link.ruleId, targets);
  }

  return result;
});

export const updateNotificationTarget = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  targetId: number,
  ownerType: NotificationOwnerType,
  ownerId: string,
  data: UpdateNotificationTargetRequest,
) {
  const displayName = Object.hasOwn(data, "displayName")
    ? { displayName: data.displayName ?? null }
    : {};

  return yield* database
    .update(notificationTargetTable)
    .set({
      ...displayName,
      active: data.active,
      updatedAt: new Date(yield* Clock.currentTimeMillis),
    })
    .where(
      and(
        eq(notificationTargetTable.id, targetId),
        eq(notificationTargetTable.ownerType, ownerType),
        eq(notificationTargetTable.ownerId, ownerId),
      ),
    )
    .returning();
});

export const readNotificationTargetRuleIds = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  targetId: number,
) {
  const links = yield* database
    .select({ ruleId: notificationRuleTargetTable.ruleId })
    .from(notificationRuleTargetTable)
    .where(eq(notificationRuleTargetTable.targetId, targetId));

  return links.map(({ ruleId }) => ruleId);
});

export const readSingleTargetNotificationRuleIds = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  ruleIds: readonly number[],
) {
  if (ruleIds.length === 0) return [];

  const counts = yield* database
    .select({ ruleId: notificationRuleTargetTable.ruleId, value: count() })
    .from(notificationRuleTargetTable)
    .where(inArray(notificationRuleTargetTable.ruleId, ruleIds))
    .groupBy(notificationRuleTargetTable.ruleId);

  return counts.filter(({ value }) => value === 1).map(({ ruleId }) => ruleId);
});

export const deleteNotificationTargetAndOrphanedRules = (
  database: typeof ApiDatabase.Service,
  targetId: number,
  orphanedRuleIds: readonly number[],
) =>
  database.transaction((transaction) =>
    Effect.gen(function* () {
      yield* transaction
        .delete(notificationTargetTable)
        .where(eq(notificationTargetTable.id, targetId));

      if (orphanedRuleIds.length > 0) {
        yield* transaction
          .delete(notificationRuleTable)
          .where(inArray(notificationRuleTable.id, orphanedRuleIds));
      }
    }),
  );
