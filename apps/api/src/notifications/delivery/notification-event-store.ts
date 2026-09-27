import { readNotificationRuleTargets } from "#src/notifications/targets/notification-target-store";
import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  notificationRuleTable,
  timerTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";

export const makeNotificationEventStore = (database: ApiDatabaseValue) => {
  const timerRules = (guildId: string, world: string) =>
    database
      .select()
      .from(notificationRuleTable)
      .where(
        and(
          eq(notificationRuleTable.ownerType, "GUILD"),
          eq(notificationRuleTable.ownerId, guildId),
          eq(notificationRuleTable.guildId, guildId),
          eq(notificationRuleTable.enabled, true),
          eq(notificationRuleTable.triggerType, "TIMER_BEFORE_SPAWN"),
          or(
            isNull(notificationRuleTable.world),
            eq(notificationRuleTable.world, world),
          ),
        ),
      );

  const watchedItemsForLoot = (itemIds: ReadonlyArray<number>, world: string) =>
    Effect.gen(function* () {
      if (itemIds.length === 0) return [];

      const rows = yield* database
        .select({ watchedItem: watchedItemTable, rule: notificationRuleTable })
        .from(watchedItemTable)
        .innerJoin(
          notificationRuleTable,
          eq(watchedItemTable.notificationRuleId, notificationRuleTable.id),
        )
        .where(
          and(
            eq(watchedItemTable.enabled, true),
            inArray(watchedItemTable.itemId, itemIds),
            eq(watchedItemTable.world, world),
            eq(notificationRuleTable.enabled, true),
            eq(notificationRuleTable.triggerType, "WATCHED_ITEM_DROPPED"),
            eq(notificationRuleTable.world, world),
          ),
        );

      const targets = yield* readNotificationRuleTargets(
        database,
        rows.map(({ rule }) => rule.id),
      );

      return rows
        .filter(({ rule }) => (targets.get(rule.id)?.length ?? 0) > 0)
        .map(({ watchedItem, rule }) => ({
          ...watchedItem,
          notificationRule: {
            ...rule,
            filters: rule.filters,
            targets: targets.get(rule.id) ?? [],
          },
        }));
    });

  const timersForRule = (guildId: string, world: string | null) =>
    database
      .select({
        npcId: timerTable.npcId,
        world: timerTable.world,
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
      .orderBy(asc(timerTable.minSpawnTime))
      .limit(50);

  return { timerRules, timersForRule, watchedItemsForLoot };
};

export type NotificationEventStore = ReturnType<
  typeof makeNotificationEventStore
>;
