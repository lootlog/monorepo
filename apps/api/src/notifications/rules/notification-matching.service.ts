import { and, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import type { NotificationFilters } from "@lootlog/schema/notifications";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import type { JsonValue } from "#src/notifications/notification-database.types";

type LootCreatedEvent = {
  readonly lootId: number;
  readonly world: string;
  readonly guildIds: string[];
  readonly itemIds: number[];
  readonly itemNames: string[];
};

export type NotificationMemberRoleInfo = {
  readonly guildId: string;
  readonly isGuildOwner: boolean;
  readonly roles: Array<{
    readonly id: string;
    readonly permissions: Permission[];
    readonly lvlRangeFrom: number | null;
    readonly lvlRangeTo: number | null;
  }>;
};

export const parseNotificationFilters = (
  filtersValue: JsonValue,
): NotificationFilters =>
  !filtersValue ||
  typeof filtersValue !== "object" ||
  Array.isArray(filtersValue)
    ? {}
    : (filtersValue as unknown as NotificationFilters);

export const notificationMatchingPolicy = {
  parseFilters: parseNotificationFilters,
  matchesTimerRule: (filtersValue: JsonValue, npcId: number) => {
    const filters = parseNotificationFilters(filtersValue);
    if (filters.npcId && filters.npcId !== npcId) return false;
    if (filters.npcIds?.length && !filters.npcIds.includes(npcId)) return false;
    return true;
  },
  matchesLootRule: (filtersValue: JsonValue, event: LootCreatedEvent) => {
    const filters = parseNotificationFilters(filtersValue);
    if (filters.itemId && !event.itemIds.includes(filters.itemId)) return false;
    if (
      filters.itemIds?.length &&
      !filters.itemIds.some((itemId) => event.itemIds.includes(itemId))
    ) {
      return false;
    }
    if (filters.world && filters.world !== event.world) return false;
    if (
      filters.guildIds?.length &&
      !filters.guildIds.some((guildId) => event.guildIds.includes(guildId))
    ) {
      return false;
    }
    return true;
  },
  matchingLootGuildIds: (filtersValue: JsonValue, guildIds: string[]) => {
    const filters = parseNotificationFilters(filtersValue);
    return filters.guildIds?.length
      ? guildIds.filter((guildId) => filters.guildIds.includes(guildId))
      : [];
  },
  canRolesViewLoot: (
    roles: NotificationMemberRoleInfo["roles"],
    npcs: readonly LootVisibilityNpc[],
    isGuildOwner?: boolean,
  ) =>
    canViewLoot({
      permissions: isGuildOwner
        ? [Permission.OWNER]
        : roles.flatMap((role) => role.permissions),
      roles: roles.map((role) => ({
        id: role.id,
        levelFrom: role.lvlRangeFrom ?? 0,
        levelTo: role.lvlRangeTo ?? 500,
        permissions: role.permissions,
      })),
      npcs,
    }),
};

export const makeNotificationMatching = (database: ApiDatabaseValue) => {
  const activeMemberships = Effect.fn(
    "notifications.matching.activeMemberships",
  )(function* (ownerIds: string[], guildIds: string[]) {
    const uniqueOwnerIds = [...new Set(ownerIds)];
    const uniqueGuildIds = [...new Set(guildIds)];
    const result = new Map<string, NotificationMemberRoleInfo[]>();
    if (uniqueOwnerIds.length === 0 || uniqueGuildIds.length === 0)
      return result;
    const memberships = yield* database
      .select({ member: memberTable, guildOwnerId: guildTable.ownerId })
      .from(memberTable)
      .innerJoin(guildTable, eq(memberTable.guildId, guildTable.id))
      .where(
        and(
          inArray(memberTable.userId, uniqueOwnerIds),
          inArray(memberTable.guildId, uniqueGuildIds),
          eq(memberTable.active, true),
        ),
      );
    const memberIds = memberships.map(({ member }) => member.id);
    const roleRows =
      memberIds.length === 0
        ? []
        : yield* database
            .select({ memberId: memberToRoleTable.A, role: roleTable })
            .from(memberToRoleTable)
            .innerJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
            .where(inArray(memberToRoleTable.A, memberIds));
    for (const { member, guildOwnerId } of memberships) {
      const values = result.get(member.userId) ?? [];
      values.push({
        guildId: member.guildId,
        isGuildOwner: guildOwnerId === member.userId,
        roles: roleRows
          .filter(({ memberId }) => memberId === member.id)
          .map(({ role }) => ({
            id: role.id,
            permissions: role.permissions,
            lvlRangeFrom: role.lvlRangeFrom,
            lvlRangeTo: role.lvlRangeTo,
          })),
      });
      result.set(member.userId, values);
    }
    return result;
  });
  return { ...notificationMatchingPolicy, activeMemberships };
};

export type NotificationMatching = ReturnType<typeof makeNotificationMatching>;
