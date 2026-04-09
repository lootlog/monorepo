import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "src/generated/prisma/client";
import { PrismaService } from "src/shared/db/prisma.service";
import type { QueryActivitiesDto } from "../dto/query-activities.dto";

function mapActivityDetails(
  details: unknown,
): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return undefined;
  }

  return details as Record<string, unknown>;
}

@Injectable()
export class ActivitiesQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: QueryActivitiesDto) {
    const limit = Math.min(query.limit ?? 50, 100);
    const where: Prisma.ActivityWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.guildId) {
      where.guildId = query.guildId;
    }

    if (query.type?.length) {
      where.type = { in: query.type };
    }

    if (query.source?.length) {
      where.source = { in: query.source };
    }

    if (query.world) {
      where.world = {
        contains: query.world,
        mode: "insensitive",
      };
    }

    if (query.playerName ?? query.clanName) {
      where.actorSnapshot = {};

      if (query.playerName) {
        where.actorSnapshot.name = {
          contains: query.playerName,
          mode: "insensitive",
        };
      }

      if (query.clanName) {
        where.actorSnapshot.clanName = {
          contains: query.clanName,
          mode: "insensitive",
        };
      }
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.cursor) {
      where.id = { lt: query.cursor };
    }

    const activities = await this.prisma.activity.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        actorSnapshot: true,
      },
    });

    const hasMore = activities.length > limit;
    const data = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    return {
      data: data.map((activity) => ({
        ...activity,
        actorSnapshot: activity.actorSnapshot ?? undefined,
        details: mapActivityDetails(activity.details),
      })),
      nextCursor,
      hasMore,
    };
  }

  async suggestActorNames(
    guildId: string,
    search?: string,
    limit = 10,
  ): Promise<string[]> {
    const limitValue = Math.min(Math.max(limit, 1), 50);
    const trimmedSearch = search?.trim();

    const where: Prisma.ActivityActorSnapshotWhereInput = {
      activities: {
        some: { guildId },
      },
    };

    if (trimmedSearch) {
      where.name = {
        contains: trimmedSearch,
        mode: "insensitive",
      };
    }

    const snapshots = await this.prisma.activityActorSnapshot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limitValue * 2,
      select: { name: true },
    });

    return this.deduplicateNames(
      snapshots.map((snapshot) => snapshot.name),
      limitValue,
    );
  }

  async suggestWorlds(
    guildId: string,
    search?: string,
    limit = 20,
  ): Promise<string[]> {
    const limitValue = Math.min(Math.max(limit, 1), 50);
    const trimmedSearch = search?.trim();

    const worldFilter = this.buildNonEmptyNullableFilter(trimmedSearch);

    const where: Prisma.ActivityWhereInput = {
      guildId,
      world: worldFilter,
    };

    const worlds = await this.prisma.activity.findMany({
      where,
      distinct: ["world"],
      select: { world: true },
      orderBy: { world: "asc" },
      take: limitValue,
    });

    return worlds
      .map((item) => item.world?.trim())
      .filter((world): world is string => !!world);
  }

  async suggestClanNames(
    guildId: string,
    search?: string,
    limit = 10,
  ): Promise<string[]> {
    const limitValue = Math.min(Math.max(limit, 1), 50);
    const trimmedSearch = search?.trim();

    const clanNameFilter = this.buildNonEmptyNullableFilter(trimmedSearch);

    const where: Prisma.ActivityActorSnapshotWhereInput = {
      activities: {
        some: { guildId },
      },
      clanName: clanNameFilter,
    };

    const snapshots = await this.prisma.activityActorSnapshot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limitValue * 2,
      select: { clanName: true },
    });

    return this.deduplicateNames(
      snapshots.map((snapshot) => snapshot.clanName),
      limitValue,
    );
  }

  findByGuild(guildId: string, query: QueryActivitiesDto) {
    return this.findMany({ ...query, guildId });
  }

  findByUser(userId: string, guildId: string, query: QueryActivitiesDto) {
    return this.findMany({ ...query, userId, guildId });
  }

  private buildNonEmptyNullableFilter(
    search?: string,
  ): Prisma.StringNullableFilter {
    const filter: Prisma.StringNullableFilter = {
      not: null,
      notIn: [""],
    };

    if (search) {
      filter.contains = search;
      filter.mode = "insensitive";
    }

    return filter;
  }

  private deduplicateNames(
    names: (string | null | undefined)[],
    limit: number,
  ): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const raw of names) {
      const name = raw?.trim();
      if (!name) {
        continue;
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(name);

      if (result.length >= limit) {
        break;
      }
    }

    return result;
  }

  async findOne(id: string, guildId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        guildId,
      },
      include: {
        actorSnapshot: true,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return {
      ...activity,
      actorSnapshot: activity.actorSnapshot ?? undefined,
      details: mapActivityDetails(activity.details),
    };
  }
}
