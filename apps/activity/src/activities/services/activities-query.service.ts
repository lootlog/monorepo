import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "#src/prisma.service";
import { temporalToDate } from "#src/shared/db/temporal";
import type { MemberActivityStatsResponse } from "../dto/member-activity-stats-response.dto.js";
import type { QueryActivitiesDto } from "../dto/query-activities.dto.js";
import { mapActivityDetails } from "../utils/map-activity-details.js";

const DEFAULT_SUGGESTION_LIMIT = 10;
const MIN_SUGGESTION_LIMIT = 1;
const MAX_SUGGESTION_LIMIT = 50;

@Injectable()
export class ActivitiesQueryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findMany(query: QueryActivitiesDto) {
    const limit = Math.min(query.limit ?? 50, 100);
    let activitiesQuery = this.prisma.db.orm.public.Activity;
    if (query.userId)
      activitiesQuery = activitiesQuery.where({ userId: query.userId });
    if (query.guildId)
      activitiesQuery = activitiesQuery.where({ guildId: query.guildId });
    if (query.type?.length) {
      activitiesQuery = activitiesQuery.where((activity) =>
        activity._type.in(query.type!),
      );
    }
    if (query.source?.length) {
      activitiesQuery = activitiesQuery.where((activity) =>
        activity.source.in(query.source!),
      );
    }
    if (query.world) {
      activitiesQuery = activitiesQuery.where((activity) =>
        activity.world.ilike(`%${query.world}%`),
      );
    }
    if (query.startDate) {
      activitiesQuery = activitiesQuery.where((activity) =>
        activity.createdAt.gte(query.startDate!),
      );
    }
    if (query.endDate) {
      activitiesQuery = activitiesQuery.where((activity) =>
        activity.createdAt.lte(query.endDate!),
      );
    }
    if (query.cursor) {
      activitiesQuery = activitiesQuery.where((activity) =>
        activity.id.lt(query.cursor!),
      );
    }

    const actorSnapshotIds = await this.findMatchingActorSnapshotIds(query);
    if (actorSnapshotIds) {
      if (actorSnapshotIds.length === 0) {
        return { data: [], nextCursor: undefined, hasMore: false };
      }
      activitiesQuery = activitiesQuery.where((activity) =>
        activity.actorSnapshotId.in(actorSnapshotIds),
      );
    }

    const activities = await activitiesQuery
      .orderBy((activity) => activity.createdAt.desc())
      .limit(limit + 1)
      .all();
    const snapshotsById = await this.loadActorSnapshots(activities);

    const hasMore = activities.length > limit;
    const data = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    return {
      data: data.map((activity) => ({
        ...activity,
        type: activity._type,
        createdAt: temporalToDate(activity.createdAt),
        actorSnapshot: activity.actorSnapshotId
          ? snapshotsById.get(activity.actorSnapshotId)
          : undefined,
        details: mapActivityDetails(activity.details),
      })),
      nextCursor,
      hasMore,
    };
  }

  async suggestActorNames(
    guildId: string,
    search?: string,
    limit = DEFAULT_SUGGESTION_LIMIT,
  ): Promise<string[]> {
    const limitValue = this.normalizeSuggestionLimit(limit);
    const trimmedSearch = search?.trim();

    const snapshotIds = await this.findGuildActorSnapshotIds(guildId);
    if (snapshotIds.length === 0) return [];
    let snapshotsQuery = this.prisma.db.orm.public.ActivityActorSnapshot.where(
      (snapshot) => snapshot.id.in(snapshotIds),
    );
    if (trimmedSearch) {
      snapshotsQuery = snapshotsQuery.where((snapshot) =>
        snapshot.name.ilike(`%${trimmedSearch}%`),
      );
    }
    const snapshots = await snapshotsQuery
      .select("name")
      .orderBy((snapshot) => snapshot.createdAt.desc())
      .limit(limitValue * 2)
      .all();

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
    const limitValue = this.normalizeSuggestionLimit(limit);
    const trimmedSearch = search?.trim();

    let worldsQuery = this.prisma.db.orm.public.Activity.where({ guildId })
      .where((activity) => activity.world.isNotNull())
      .where((activity) => activity.world.neq(""));
    if (trimmedSearch) {
      worldsQuery = worldsQuery.where((activity) =>
        activity.world.ilike(`%${trimmedSearch}%`),
      );
    }
    const worlds = await worldsQuery
      .groupBy("world")
      .orderBy((activity) => activity.world.asc())
      .limit(limitValue)
      .aggregate((aggregate) => ({ count: aggregate.count() }));

    return worlds
      .map((item) => item.world?.trim())
      .filter((world): world is string => !!world);
  }

  async suggestClanNames(
    guildId: string,
    search?: string,
    limit = DEFAULT_SUGGESTION_LIMIT,
  ): Promise<string[]> {
    const limitValue = this.normalizeSuggestionLimit(limit);
    const trimmedSearch = search?.trim();

    const snapshotIds = await this.findGuildActorSnapshotIds(guildId);
    if (snapshotIds.length === 0) return [];
    let snapshotsQuery = this.prisma.db.orm.public.ActivityActorSnapshot.where(
      (snapshot) => snapshot.id.in(snapshotIds),
    )
      .where((snapshot) => snapshot.clanName.isNotNull())
      .where((snapshot) => snapshot.clanName.neq(""));
    if (trimmedSearch) {
      snapshotsQuery = snapshotsQuery.where((snapshot) =>
        snapshot.clanName.ilike(`%${trimmedSearch}%`),
      );
    }
    const snapshots = await snapshotsQuery
      .select("clanName")
      .orderBy((snapshot) => snapshot.createdAt.desc())
      .limit(limitValue * 2)
      .all();

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

  async findMemberActivityStatsByGuild(
    guildId: string,
  ): Promise<MemberActivityStatsResponse[]> {
    const rows = await this.prisma.db.orm.public.MemberActivityStats.where({
      guildId,
    })
      .orderBy([
        (stats) => stats.activeSessionCount.desc(),
        (stats) => stats.lastSeenAt.desc(),
        (stats) => stats.source.asc(),
      ])
      .all();

    return rows.map((row) => ({
      ...row,
      lastSeenAt: row.lastSeenAt ? temporalToDate(row.lastSeenAt) : undefined,
      createdAt: temporalToDate(row.createdAt),
      updatedAt: temporalToDate(row.updatedAt),
    }));
  }

  private normalizeSuggestionLimit(limit: number): number {
    return Math.min(
      Math.max(limit, MIN_SUGGESTION_LIMIT),
      MAX_SUGGESTION_LIMIT,
    );
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
    const activity = await this.prisma.db.orm.public.Activity.where({
      id,
      guildId,
    }).first();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    const actorSnapshot = activity.actorSnapshotId
      ? await this.prisma.db.orm.public.ActivityActorSnapshot.first({
          id: activity.actorSnapshotId,
        })
      : null;

    return {
      ...activity,
      type: activity._type,
      createdAt: temporalToDate(activity.createdAt),
      actorSnapshot: actorSnapshot
        ? {
            ...actorSnapshot,
            createdAt: temporalToDate(actorSnapshot.createdAt),
          }
        : undefined,
      details: mapActivityDetails(activity.details),
    };
  }

  private async findGuildActorSnapshotIds(guildId: string): Promise<string[]> {
    const activities = await this.prisma.db.orm.public.Activity.where({
      guildId,
    })
      .where((activity) => activity.actorSnapshotId.isNotNull())
      .select("actorSnapshotId")
      .all();
    const actorSnapshotIds = new Set<string>();
    for (const { actorSnapshotId } of activities) {
      if (typeof actorSnapshotId === "string") {
        actorSnapshotIds.add(actorSnapshotId);
      }
    }
    return [...actorSnapshotIds];
  }

  private async findMatchingActorSnapshotIds(
    query: QueryActivitiesDto,
  ): Promise<string[] | null> {
    if (!query.playerName && !query.clanName) return null;
    let snapshots =
      this.prisma.db.orm.public.ActivityActorSnapshot.select("id");
    if (query.playerName) {
      snapshots = snapshots.where((snapshot) =>
        snapshot.name.ilike(`%${query.playerName}%`),
      );
    }
    if (query.clanName) {
      snapshots = snapshots.where((snapshot) =>
        snapshot.clanName.ilike(`%${query.clanName}%`),
      );
    }
    return (await snapshots.all()).map(({ id }) => id);
  }

  private async loadActorSnapshots(
    activities: Array<{ actorSnapshotId: string | null }>,
  ) {
    const ids = [
      ...new Set(
        activities.flatMap(({ actorSnapshotId }) => actorSnapshotId ?? []),
      ),
    ];
    if (ids.length === 0) return new Map();
    const snapshots =
      await this.prisma.db.orm.public.ActivityActorSnapshot.where((snapshot) =>
        snapshot.id.in(ids),
      ).all();
    return new Map(
      snapshots.map((snapshot) => [
        snapshot.id,
        { ...snapshot, createdAt: temporalToDate(snapshot.createdAt) },
      ]),
    );
  }
}
