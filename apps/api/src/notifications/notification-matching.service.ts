import { Injectable } from "@nestjs/common";
import type { NotificationFilters } from "@lootlog/types";
import { Prisma } from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";

type LootCreatedEvent = {
  lootId: number;
  world: string;
  guildIds: string[];
  itemIds: number[];
  itemNames: string[];
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
        filters.guildIds!.includes(guildId),
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
        globalUserId: {
          in: uniqueOwnerIds,
        },
        guildId: {
          in: uniqueGuildIds,
        },
        active: true,
      },
      select: {
        globalUserId: true,
        guildId: true,
      },
    });

    for (const membership of memberships) {
      if (!membership.globalUserId) {
        continue;
      }

      const ownerGuildIds =
        activeGuildIdsByOwnerId.get(membership.globalUserId) ?? new Set();
      ownerGuildIds.add(membership.guildId);
      activeGuildIdsByOwnerId.set(membership.globalUserId, ownerGuildIds);
    }

    return activeGuildIdsByOwnerId;
  }
}
