import { isJsonObject, type JsonValue } from "#src/database/json";
import { toLootVisibilityRoles } from "#src/loots/loot-visibility";
import { and, eq, inArray } from "drizzle-orm";
import { Effect, Schema } from "effect";
import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import {
  NotificationFiltersSchema,
  type NotificationFilters,
} from "@lootlog/schema/notifications";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";

type LootCreatedEvent = {
  readonly lootId: number;
  readonly world: string;
  readonly guildIds: ReadonlyArray<string>;
  readonly itemIds: ReadonlyArray<number>;
  readonly itemNames: ReadonlyArray<string>;
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

const decodeNotificationFilters = Schema.decodeUnknownSync(
  NotificationFiltersSchema,
  { onExcessProperty: "preserve" },
);

export const parseNotificationFilters = (
  filtersValue: JsonValue,
): NotificationFilters =>
  isJsonObject(filtersValue) ? decodeNotificationFilters(filtersValue) : {};

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
  matchingLootGuildIds: (
    filtersValue: JsonValue,
    guildIds: ReadonlyArray<string>,
  ) => {
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
      roles: toLootVisibilityRoles(roles),
      npcs,
    }),
};

export const selectNotificationMemberships = Effect.fn(
  "notifications.matching.activeMemberships",
)(function* (
  database: ApiDatabaseValue,
  ownerIds: string[],
  guildIds: ReadonlyArray<string>,
) {
  const uniqueOwnerIds = [...new Set(ownerIds)];
  const uniqueGuildIds = [...new Set(guildIds)];
  const result = new Map<string, NotificationMemberRoleInfo[]>();

  if (uniqueOwnerIds.length === 0 || uniqueGuildIds.length === 0) return result;

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

export const makeNotificationMatching = (database: ApiDatabaseValue) => ({
  ...notificationMatchingPolicy,
  activeMemberships: (ownerIds: string[], guildIds: ReadonlyArray<string>) =>
    selectNotificationMemberships(database, ownerIds, guildIds),
});

export type NotificationMatching = ReturnType<typeof makeNotificationMatching>;
