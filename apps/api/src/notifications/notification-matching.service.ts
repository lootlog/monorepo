import { Injectable } from "@nestjs/common";
import { canViewLoot, type LootVisibilityNpc } from "@lootlog/loot-visibility";
import type { NotificationFilters } from "@lootlog/types";
import { Permission, type Prisma } from "#src/generated/prisma/client";
import { PrismaService } from "#src/db/prisma.service";

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

@Injectable()
export class NotificationMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  matchesTimerRule(filtersValue: Prisma.JsonValue, npcId: number) {
    const filters = this.parseFilters(filtersValue);

    if (filters.npcId && filters.npcId !== npcId) {
      return false;
    }

    if (filters.npcIds?.length && !filters.npcIds.includes(npcId)) {
      return false;
    }

    return true;
  }

  matchesLootRule(filtersValue: Prisma.JsonValue, event: LootCreatedEvent) {
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

  parseFilters(filtersValue: Prisma.JsonValue): NotificationFilters {
    if (
      !filtersValue ||
      typeof filtersValue !== "object" ||
      Array.isArray(filtersValue)
    ) {
      return {};
    }

    return filtersValue as unknown as NotificationFilters;
  }

  getMatchingLootGuildIds(
    filtersValue: Prisma.JsonValue,
    eventGuildIds: string[],
  ) {
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

    const memberships = await this.prisma.member.findMany({
      where: {
        userId: { in: uniqueOwnerIds },
        guildId: { in: uniqueGuildIds },
        active: true,
      },
      select: {
        userId: true,
        guildId: true,
        guild: {
          select: {
            ownerId: true,
          },
        },
        roles: {
          select: {
            id: true,
            permissions: true,
            lvlRangeFrom: true,
            lvlRangeTo: true,
          },
        },
      },
    });

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
