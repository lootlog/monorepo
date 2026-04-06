import { Injectable } from "@nestjs/common";
import type { NotificationFilters } from "@lootlog/types";
import { NpcType, Permission, type Prisma } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";

type LootCreatedEvent = {
  lootId: number;
  world: string;
  guildIds: string[];
  itemIds: number[];
  itemNames: string[];
  npcType?: NpcType | null;
  npcLvl?: number | null;
};

type MemberRoleInfo = {
  guildId: string;
  isGuildOwner: boolean;
  roles: {
    permissions: Permission[];
    lvlRangeFrom: number | null;
    lvlRangeTo: number | null;
  }[];
};

@Injectable()
export class NotificationMatchingService {
  constructor(private readonly prisma: PrismaService) {}

  matchesTimerRule(filtersValue: Prisma.JsonValue, npcName: string | null) {
    if (!npcName) {
      return false;
    }

    const filters = this.parseFilters(filtersValue);

    if (filters.npcName && filters.npcName !== npcName) {
      return false;
    }

    if (filters.npcNames?.length && !filters.npcNames.includes(npcName)) {
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

  async getActiveMembershipGuildIdsByOwner(
    ownerIds: string[],
    guildIds: string[],
  ) {
    const uniqueOwnerIds = [...new Set(ownerIds)];
    const uniqueGuildIds = [...new Set(guildIds)];
    const activeGuildIdsByOwnerId = new Map<string, Set<string>>();

    if (uniqueOwnerIds.length === 0 || uniqueGuildIds.length === 0) {
      return activeGuildIdsByOwnerId;
    }

    const memberships = await this.prisma.member.findMany({
      where: {
        userId: {
          in: uniqueOwnerIds,
        },
        guildId: {
          in: uniqueGuildIds,
        },
        active: true,
      },
      select: {
        userId: true,
        guildId: true,
      },
    });

    for (const membership of memberships) {
      const ownerGuildIds =
        activeGuildIdsByOwnerId.get(membership.userId) ?? new Set();
      ownerGuildIds.add(membership.guildId);
      activeGuildIdsByOwnerId.set(membership.userId, ownerGuildIds);
    }

    return activeGuildIdsByOwnerId;
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

  canRolesViewNpc(
    roles: MemberRoleInfo["roles"],
    npcType: NpcType | null | undefined,
    npcLvl: number | null | undefined,
    isGuildOwner?: boolean,
  ): boolean {
    if (isGuildOwner) {
      return true;
    }

    const allPermissions = roles.flatMap((r) => r.permissions);

    if (isAdministrativeUser(allPermissions)) {
      return true;
    }

    const readableRoles = roles.filter((role) =>
      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
    );

    if (readableRoles.length === 0) {
      return false;
    }

    return readableRoles.some((role) => {
      const lvlFrom = role.lvlRangeFrom ?? 0;
      const lvlTo = role.lvlRangeTo ?? 500;

      const lvlOk =
        npcLvl === null || npcLvl === undefined
          ? lvlFrom <= 0 || lvlTo >= 0
          : npcLvl >= lvlFrom && npcLvl <= lvlTo;

      if (!lvlOk) {
        return false;
      }

      if (
        !role.permissions.includes(Permission.LOOTLOG_LOOTS_TITANS_READ) &&
        npcType === NpcType.TITAN
      ) {
        return false;
      }

      if (
        !role.permissions.includes(Permission.LOOTLOG_LOOTS_HEROES_READ) &&
        (npcType === NpcType.HERO || npcType === NpcType.EVENT_HERO)
      ) {
        return false;
      }

      return true;
    });
  }
}
