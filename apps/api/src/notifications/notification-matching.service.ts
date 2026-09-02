import {
  canViewLoot,
  type LootVisibilityNpc,
} from "@lootlog/domain/loot-visibility";
import type { NotificationFilters } from "@lootlog/schema/notifications";
import { Permission } from "@lootlog/schema/permissions";
import type { JsonValue } from "./notification-database.types.js";
import { NotificationsRepository } from "./notifications.repository.js";

type LootCreatedEvent = {
  lootId: number;
  world: string;
  guildIds: string[];
  itemIds: number[];
  itemNames: string[];
};

type MemberRoleInfo = {
  guildId: string;
  isGuildOwner: boolean;
  roles: {
    id: string;
    permissions: Permission[];
    lvlRangeFrom: number | null;
    lvlRangeTo: number | null;
  }[];
};

export class NotificationMatchingService {
  constructor(private readonly repository: NotificationsRepository) {}

  matchesTimerRule(filtersValue: JsonValue, npcId: number) {
    const filters = this.parseFilters(filtersValue);

    if (filters.npcId && filters.npcId !== npcId) {
      return false;
    }

    if (filters.npcIds?.length && !filters.npcIds.includes(npcId)) {
      return false;
    }

    return true;
  }

  matchesLootRule(filtersValue: JsonValue, event: LootCreatedEvent) {
    const filters = this.parseFilters(filtersValue);

    if (filters.itemId && !event.itemIds.includes(filters.itemId)) {
      return false;
    }

    if (
      filters.itemIds?.length &&
      !filters.itemIds.some((itemId) => event.itemIds.includes(itemId))
    ) {
      return false;
    }

    if (filters.world && filters.world !== event.world) {
      return false;
    }

    if (
      filters.guildIds?.length &&
      !filters.guildIds.some((guildId) => event.guildIds.includes(guildId))
    ) {
      return false;
    }

    return true;
  }

  parseFilters(filtersValue: JsonValue): NotificationFilters {
    if (
      !filtersValue ||
      typeof filtersValue !== "object" ||
      Array.isArray(filtersValue)
    ) {
      return {};
    }

    return filtersValue as unknown as NotificationFilters;
  }

  getMatchingLootGuildIds(filtersValue: JsonValue, eventGuildIds: string[]) {
    const filters = this.parseFilters(filtersValue);

    if (filters.guildIds?.length) {
      return eventGuildIds.filter((guildId) =>
        filters.guildIds.includes(guildId),
      );
    }

    return [];
  }

  async getActiveMembershipsWithRoles(
    ownerIds: string[],
    guildIds: string[],
  ): Promise<Map<string, MemberRoleInfo[]>> {
    const uniqueOwnerIds = [...new Set(ownerIds)];
    const uniqueGuildIds = [...new Set(guildIds)];
    const result = new Map<string, MemberRoleInfo[]>();

    if (uniqueOwnerIds.length === 0 || uniqueGuildIds.length === 0) {
      return result;
    }

    const memberships = await this.repository.findActiveMemberships(
      uniqueOwnerIds,
      uniqueGuildIds,
    );

    for (const membership of memberships) {
      const existing = result.get(membership.userId) ?? [];
      existing.push({
        guildId: membership.guildId,
        isGuildOwner: membership.guild.ownerId === membership.userId,
        roles: membership.roles,
      });
      result.set(membership.userId, existing);
    }

    return result;
  }

  canRolesViewLoot(
    roles: MemberRoleInfo["roles"],
    npcs: readonly LootVisibilityNpc[],
    isGuildOwner?: boolean,
  ): boolean {
    const permissions = isGuildOwner
      ? [Permission.OWNER]
      : roles.flatMap((role) => role.permissions);

    return canViewLoot({
      permissions,
      roles: roles.map((role) => ({
        id: role.id,
        levelFrom: role.lvlRangeFrom ?? 0,
        levelTo: role.lvlRangeTo ?? 500,
        permissions: role.permissions,
      })),
      npcs,
    });
  }
}
