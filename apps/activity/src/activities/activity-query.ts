import type { Prisma } from "../generated/prisma/client.js";
import { NotFoundError } from "../lib/errors/http-errors.js";
import { PrismaDatabase } from "../shared/prisma/prisma-database.js";
import type { QueryActivitiesSchema } from "./schemas/query-activities.schema.js";

function mapActivityDetails(
  details: unknown,
): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return undefined;
  }

  return details as Record<string, unknown>;
}

export class ActivityQuery {
  constructor(private readonly prismaDatabase: PrismaDatabase) {}

  async findByGuild(guildId: string, query: QueryActivitiesSchema) {
    return this.findMany({
      ...query,
      guildId,
    });
  }

  async findByUser(
    userId: string,
    guildId: string,
    query: QueryActivitiesSchema,
  ) {
    return this.findMany({
      ...query,
      userId,
      guildId,
    });
  }

  async findOne(activityId: string, guildId: string) {
    const activity = await this.prismaDatabase.activity.findFirst({
      where: {
        id: activityId,
        guildId,
      },
      include: {
        actorSnapshot: true,
      },
    });

    if (!activity) {
      throw new NotFoundError(`Activity with ID ${activityId} not found`);
    }

    return {
      ...activity,
      actorSnapshot: activity.actorSnapshot ?? undefined,
      details: mapActivityDetails(activity.details),
    };
  }

  async suggestActorNames(guildId: string, search?: string, limit = 10) {
    const limitValue = Math.min(Math.max(limit, 1), 50);
    const trimmedSearch = search?.trim();

    const where: Prisma.ActivityActorSnapshotWhereInput = {
      activities: {
        some: {
          guildId,
        },
      },
    };

    if (trimmedSearch) {
      where.name = {
        contains: trimmedSearch,
        mode: "insensitive",
      };
    }

    const snapshots = await this.prismaDatabase.activityActorSnapshot.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limitValue * 2,
      select: {
        name: true,
      },
    });

    return this.deduplicateNames(
      snapshots.map((snapshot) => snapshot.name),
      limitValue,
    );
  }

  async suggestWorlds(guildId: string, search?: string, limit = 20) {
    const limitValue = Math.min(Math.max(limit, 1), 50);
    const trimmedSearch = search?.trim();

    const worlds = await this.prismaDatabase.activity.findMany({
      where: {
        guildId,
        world: this.buildNonEmptyNullableFilter(trimmedSearch),
      },
      distinct: ["world"],
      select: {
        world: true,
      },
      orderBy: {
        world: "asc",
      },
      take: limitValue,
    });

    return worlds
      .map((item) => item.world?.trim())
      .filter((world): world is string => Boolean(world));
  }

  async suggestClanNames(guildId: string, search?: string, limit = 10) {
    const limitValue = Math.min(Math.max(limit, 1), 50);
    const trimmedSearch = search?.trim();

    const snapshots = await this.prismaDatabase.activityActorSnapshot.findMany({
      where: {
        activities: {
          some: {
            guildId,
          },
        },
        clanName: this.buildNonEmptyNullableFilter(trimmedSearch),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limitValue * 2,
      select: {
        clanName: true,
      },
    });

    return this.deduplicateNames(
      snapshots.map((snapshot) => snapshot.clanName),
      limitValue,
    );
  }

  private async findMany(query: QueryActivitiesSchema) {
    const limit = Math.min(query.limit ?? 50, 100);
    const where: Prisma.ActivityWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.guildId) {
      where.guildId = query.guildId;
    }

    if (query.type?.length) {
      where.type = {
        in: query.type,
      };
    }

    if (query.source?.length) {
      where.source = {
        in: query.source,
      };
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
      where.id = {
        lt: query.cursor,
      };
    }

    const activities = await this.prismaDatabase.activity.findMany({
      where,
      take: limit + 1,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        actorSnapshot: true,
      },
    });

    const hasMore = activities.length > limit;
    const activityPage = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore
      ? activityPage[activityPage.length - 1]?.id
      : undefined;

    return {
      data: activityPage.map((activity) => ({
        ...activity,
        actorSnapshot: activity.actorSnapshot ?? undefined,
        details: mapActivityDetails(activity.details),
      })),
      nextCursor,
      hasMore,
    };
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
  ) {
    const seenNames = new Set<string>();
    const uniqueNames: string[] = [];

    for (const rawName of names) {
      const normalizedName = rawName?.trim();

      if (!normalizedName) {
        continue;
      }

      const deduplicationKey = normalizedName.toLowerCase();

      if (seenNames.has(deduplicationKey)) {
        continue;
      }

      seenNames.add(deduplicationKey);
      uniqueNames.push(normalizedName);

      if (uniqueNames.length >= limit) {
        break;
      }
    }

    return uniqueNames;
  }
}
