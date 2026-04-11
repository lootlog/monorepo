import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  Guild,
  ItemRarity,
  Permission,
  Role,
} from "src/generated/prisma/client";
import type { LootQueryResult } from "src/loots/dto/loot-query-result.dto";
import { LootsService } from "src/loots/loots.service";
import { PrismaService } from "src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared";
import { clipToWindowSeconds } from "../utils/tracking-window.util";
import {
  EVENT_WRAPPED_CACHE_TTL_SECONDS,
  getEventWrappedCacheKey,
} from "src/shared/constants/cache.constant";
import type {
  EventWrappedCoverageDto,
  EventWrappedHeroCoverageDto,
  EventWrappedHeroDto,
  EventWrappedLeaderDto,
  EventWrappedLootHeroDto,
  EventWrappedRarityTotalsDto,
  EventWrappedResponseDto,
} from "../dto/event-wrapped.dto";

type RankingRow = {
  memberId: number;
  heroNpcName: string;
  totalPoints: number;
  totalKills: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  member: {
    id: number;
    name: string;
    avatar: string | null;
  };
};

type AssignmentRow = {
  mapId: string;
  heroNpcId: string;
  memberId: number;
  assignedAt: Date;
  unassignedAt: Date | null;
  member: {
    id: number;
    name: string;
    avatar: string | null;
  };
};

type SummaryRow = {
  heroNpcId: string;
  totalWindowSeconds: number;
  totalCoverageSeconds: number;
  totalUncoveredSeconds: number;
  totalUnassignedSeconds: number;
  mapStats: unknown;
};

type AggregatedMember = {
  memberId: number;
  name: string;
  avatar: string | null;
  totalPoints: number;
  totalKills: number;
  totalTimeSeconds: number;
  totalAfkSeconds: number;
  distinctMapIds: Set<string>;
  distinctHeroIds: Set<string>;
  assignmentCount: number;
  totalAssignedSeconds: number;
  longestSingleAssignmentSeconds: number;
  maxMapsPerRespawn: number;
  avgMapsPerRespawn: number;
};

type HeroLootAggregate = {
  totalLoots: number;
  rarityTotals: EventWrappedRarityTotalsDto;
};

const createEmptyRarityTotals = (): EventWrappedRarityTotalsDto => ({
  unique: 0,
  heroic: 0,
  legendary: 0,
});

const roundToTwo = (value: number): number =>
  Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;

const getRarityKey = (
  rarity: ItemRarity | null | undefined,
): keyof EventWrappedRarityTotalsDto | null => {
  if (rarity === "UNIQUE") return "unique";
  if (rarity === "HEROIC") return "heroic";
  if (rarity === "LEGENDARY") return "legendary";
  return null;
};

const countMapStats = (mapStats: unknown): number => {
  return Array.isArray(mapStats) ? mapStats.length : 0;
};

@Injectable()
export class EventWrappedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly lootsService: LootsService,
  ) {}

  async getWrapped(
    guild: Guild,
    eventId: string,
    permissions: Permission[],
    roles: Role[],
  ): Promise<EventWrappedResponseDto> {
    const cacheKey = getEventWrappedCacheKey(guild.id, eventId);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as EventWrappedResponseDto;
    }

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, guildId: guild.id },
      select: {
        id: true,
        name: true,
        world: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        heroNpcs: {
          select: {
            id: true,
            npcId: true,
            npcName: true,
            npcIcon: true,
            maps: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const eventWindowStart = event.startsAt ?? event.createdAt;
    const eventWindowEnd = event.endsAt ?? new Date();
    const heroIds = event.heroNpcs.map((hero) => hero.id);
    const heroByName = new Map(
      event.heroNpcs.map((hero) => [hero.npcName.toLowerCase(), hero]),
    );

    const [rankings, kills, windowSummaries, assignments, loots] =
      await Promise.all([
        this.prisma.eventRanking.findMany({
          where: { eventId },
          select: {
            memberId: true,
            heroNpcName: true,
            totalPoints: true,
            totalKills: true,
            totalTimeSeconds: true,
            avgAfkPercentage: true,
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        }) as Promise<RankingRow[]>,
        this.prisma.eventHeroKill.findMany({
          where: { heroNpcId: { in: heroIds } },
          select: {
            id: true,
            heroNpcId: true,
            killedAt: true,
            minSpawnTimeAtKill: true,
          },
          orderBy: { killedAt: "asc" },
        }),
        this.prisma.eventRespawnWindowSummary.findMany({
          where: { heroNpcId: { in: heroIds } },
          select: {
            heroNpcId: true,
            totalWindowSeconds: true,
            totalCoverageSeconds: true,
            totalUncoveredSeconds: true,
            totalUnassignedSeconds: true,
            mapStats: true,
          },
        }) as Promise<SummaryRow[]>,
        this.prisma.eventMapAssignmentHistory.findMany({
          where: { heroNpcId: { in: heroIds } },
          select: {
            mapId: true,
            heroNpcId: true,
            memberId: true,
            assignedAt: true,
            unassignedAt: true,
            member: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        }) as Promise<AssignmentRow[]>,
        this.getEventLoots({
          guild,
          permissions,
          roles,
          world: event.world,
          heroNames: event.heroNpcs.map((hero) => hero.npcName),
          createdAtMin: eventWindowStart.toISOString(),
          createdAtMax: eventWindowEnd.toISOString(),
        }),
      ]);

    const members = this.aggregateMembers(rankings, assignments, kills, {
      eventWindowStart,
      eventWindowEnd,
    });
    const heroLoots = this.aggregateHeroLoots(loots, heroByName);
    const coverage = this.aggregateCoverage(windowSummaries, event.heroNpcs);
    const avgMapsPerSpawnWindow = this.calculateAverageMapsPerSpawnWindow(
      kills,
      assignments,
    );

    const heroEntries: EventWrappedHeroDto[] = event.heroNpcs
      .map((hero) => {
        const heroRankings = rankings.filter(
          (ranking) => ranking.heroNpcName === hero.npcName,
        );
        const totalPoints = heroRankings.reduce(
          (sum, ranking) => sum + ranking.totalPoints,
          0,
        );
        const totalKills = heroRankings.reduce(
          (sum, ranking) => sum + ranking.totalKills,
          0,
        );
        const topHunter = this.selectLeader(
          heroRankings,
          (ranking) => ranking.totalKills,
        );

        return {
          heroNpcId: hero.id,
          npcId: hero.npcId,
          npcName: hero.npcName,
          npcIcon: hero.npcIcon,
          mapCount: hero.maps.length,
          totalKills,
          totalPoints: roundToTwo(totalPoints),
          coveragePercentage: roundToTwo(
            coverage.heroCoverageById.get(hero.id)?.coveragePercentage ?? 0,
          ),
          rarityTotals:
            heroLoots.get(hero.id)?.rarityTotals ?? createEmptyRarityTotals(),
          topHunter,
        };
      })
      .sort((left, right) => right.totalKills - left.totalKills);

    const killsByHour = new Map<number, number>();
    for (const kill of kills) {
      const hour = kill.killedAt.getHours();
      killsByHour.set(hour, (killsByHour.get(hour) ?? 0) + 1);
    }

    let busiestHour: number | null = null;
    let busiestHourKills = 0;
    for (const [hour, count] of killsByHour.entries()) {
      if (count > busiestHourKills) {
        busiestHour = hour;
        busiestHourKills = count;
      }
    }

    const totalPoints = Array.from(members.values()).reduce(
      (sum, member) => sum + member.totalPoints,
      0,
    );
    const totalTrackedSeconds = Array.from(members.values()).reduce(
      (sum, member) => sum + member.totalTimeSeconds,
      0,
    );
    const totalAfkSeconds = Array.from(members.values()).reduce(
      (sum, member) => sum + member.totalAfkSeconds,
      0,
    );
    const totalLoots = loots.length;
    const totalRarityTotals = Array.from(heroLoots.values()).reduce(
      (accumulator, aggregate) => {
        accumulator.unique += aggregate.rarityTotals.unique;
        accumulator.heroic += aggregate.rarityTotals.heroic;
        accumulator.legendary += aggregate.rarityTotals.legendary;
        return accumulator;
      },
      createEmptyRarityTotals(),
    );

    const memberList = Array.from(members.values());

    const response: EventWrappedResponseDto = {
      generatedAt: new Date().toISOString(),
      event: {
        id: event.id,
        name: event.name,
        world: event.world,
        startsAt: event.startsAt?.toISOString() ?? null,
        endsAt: event.endsAt?.toISOString() ?? null,
        heroCount: event.heroNpcs.length,
        mapCount: event.heroNpcs.reduce(
          (sum, hero) => sum + hero.maps.length,
          0,
        ),
        spawnCount: kills.length,
      },
      overview: {
        totalKills: kills.length,
        participantCount: memberList.length,
        totalPoints: roundToTwo(totalPoints),
        totalTrackedSeconds,
        totalAfkSeconds,
        coveragePercentage: roundToTwo(coverage.coveragePercentage),
        avgMapsPerSpawnWindow: roundToTwo(avgMapsPerSpawnWindow),
        busiestHour,
        busiestHourKills,
        totalLoots,
        rarityTotals: totalRarityTotals,
      },
      leaders: {
        topHunter: this.selectLeader(memberList, (member) => member.totalKills),
        topScorer: this.selectLeader(
          memberList,
          (member) => member.totalPoints,
        ),
        longestDuty: this.selectLeader(
          memberList,
          (member) => member.totalAssignedSeconds,
        ),
        topAfk: this.selectLeader(
          memberList,
          (member) => member.totalAfkSeconds,
        ),
        mostFlexible: this.selectLeader(
          memberList,
          (member) => member.maxMapsPerRespawn,
          (member) => member.avgMapsPerRespawn,
        ),
        topEfficiency: this.selectLeader(
          memberList.filter((member) => member.totalKills > 0),
          (member) => member.totalPoints / member.totalKills,
          (member) => member.totalKills,
        ),
      },
      coverage: {
        totalWindowCount: windowSummaries.length,
        totalWindowSeconds: coverage.totalWindowSeconds,
        totalCoverageSeconds: coverage.totalCoverageSeconds,
        totalUncoveredSeconds: coverage.totalUncoveredSeconds,
        totalUnassignedSeconds: coverage.totalUnassignedSeconds,
        coveragePercentage: roundToTwo(coverage.coveragePercentage),
        avgMapsPerSpawnWindow: roundToTwo(avgMapsPerSpawnWindow),
        bestHeroCoverage: coverage.bestHeroCoverage,
        roughestHeroCoverage: coverage.roughestHeroCoverage,
      },
      heroes: heroEntries,
      loot: {
        totalLoots,
        rarityTotals: totalRarityTotals,
        heroBreakdown: event.heroNpcs
          .map(
            (hero): EventWrappedLootHeroDto => ({
              heroNpcId: hero.id,
              npcName: hero.npcName,
              npcIcon: hero.npcIcon,
              totalLoots: heroLoots.get(hero.id)?.totalLoots ?? 0,
              rarityTotals:
                heroLoots.get(hero.id)?.rarityTotals ??
                createEmptyRarityTotals(),
            }),
          )
          .sort((left, right) => right.totalLoots - left.totalLoots),
      },
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(response),
      EVENT_WRAPPED_CACHE_TTL_SECONDS,
    );

    return response;
  }

  private getEventLoots(params: {
    guild: Guild;
    permissions: Permission[];
    roles: Role[];
    world: string;
    heroNames: string[];
    createdAtMin: string;
    createdAtMax: string;
  }): Promise<LootQueryResult[]> {
    if (params.heroNames.length === 0) {
      return Promise.resolve([]);
    }

    const fetchLootsBatch = async (
      cursor: number | undefined,
      collectedLoots: LootQueryResult[],
    ): Promise<LootQueryResult[]> => {
      const batch = await this.lootsService.fetchLootsByGuildId(
        params.guild,
        params.permissions,
        params.roles,
        {
          limit: 100,
          cursor,
          players: [],
          rarities: [],
          npcTypes: [],
          npcs: params.heroNames,
          world: params.world,
          createdAtMin: params.createdAtMin,
          createdAtMax: params.createdAtMax,
        },
      );

      collectedLoots.push(...batch);

      if (batch.length < 100) {
        return collectedLoots;
      }

      const nextCursor = batch[batch.length - 1]?.id;
      if (!nextCursor) {
        return collectedLoots;
      }

      return fetchLootsBatch(nextCursor, collectedLoots);
    };

    return fetchLootsBatch(undefined, []);
  }

  private aggregateMembers(
    rankings: RankingRow[],
    assignments: AssignmentRow[],
    kills: Array<{
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
    options: { eventWindowStart: Date; eventWindowEnd: Date },
  ): Map<number, AggregatedMember> {
    const members = new Map<number, AggregatedMember>();
    const respawnStatsByMemberId = this.calculateMemberRespawnMapStats(
      kills,
      assignments,
    );

    for (const ranking of rankings) {
      const existing = members.get(ranking.memberId) ?? {
        memberId: ranking.member.id,
        name: ranking.member.name,
        avatar: ranking.member.avatar,
        totalPoints: 0,
        totalKills: 0,
        totalTimeSeconds: 0,
        totalAfkSeconds: 0,
        distinctMapIds: new Set<string>(),
        distinctHeroIds: new Set<string>(),
        assignmentCount: 0,
        totalAssignedSeconds: 0,
        longestSingleAssignmentSeconds: 0,
        maxMapsPerRespawn: 0,
        avgMapsPerRespawn: 0,
      };

      existing.totalPoints += ranking.totalPoints;
      existing.totalKills += ranking.totalKills;
      existing.totalTimeSeconds += ranking.totalTimeSeconds;
      existing.totalAfkSeconds += Math.round(
        ranking.totalTimeSeconds * (ranking.avgAfkPercentage / 100),
      );

      members.set(ranking.memberId, existing);
    }

    for (const assignment of assignments) {
      const existing = members.get(assignment.memberId) ?? {
        memberId: assignment.member.id,
        name: assignment.member.name,
        avatar: assignment.member.avatar,
        totalPoints: 0,
        totalKills: 0,
        totalTimeSeconds: 0,
        totalAfkSeconds: 0,
        distinctMapIds: new Set<string>(),
        distinctHeroIds: new Set<string>(),
        assignmentCount: 0,
        totalAssignedSeconds: 0,
        longestSingleAssignmentSeconds: 0,
        maxMapsPerRespawn: 0,
        avgMapsPerRespawn: 0,
      };

      const durationSeconds = clipToWindowSeconds({
        start: assignment.assignedAt,
        end: assignment.unassignedAt,
        windowStart: options.eventWindowStart,
        windowEnd: options.eventWindowEnd,
      });

      existing.assignmentCount += 1;
      existing.totalAssignedSeconds += durationSeconds;
      existing.longestSingleAssignmentSeconds = Math.max(
        existing.longestSingleAssignmentSeconds,
        durationSeconds,
      );
      existing.distinctMapIds.add(assignment.mapId);
      existing.distinctHeroIds.add(assignment.heroNpcId);

      members.set(assignment.memberId, existing);
    }

    for (const [memberId, existing] of members) {
      const respawnStats = respawnStatsByMemberId.get(memberId);

      existing.maxMapsPerRespawn = respawnStats?.maxMapsPerRespawn ?? 0;
      existing.avgMapsPerRespawn = respawnStats?.avgMapsPerRespawn ?? 0;
    }

    return members;
  }

  private calculateMemberRespawnMapStats(
    kills: Array<{
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
    assignments: AssignmentRow[],
  ): Map<
    number,
    {
      maxMapsPerRespawn: number;
      avgMapsPerRespawn: number;
    }
  > {
    const respawnCountsByMember = new Map<number, number[]>();

    for (const kill of kills) {
      const mapIdsByMember = new Map<number, Set<string>>();

      for (const assignment of assignments) {
        const overlapsWindow =
          assignment.assignedAt <= kill.killedAt &&
          (assignment.unassignedAt === null ||
            assignment.unassignedAt >= kill.minSpawnTimeAtKill);

        if (!overlapsWindow) {
          continue;
        }

        const memberMapIds =
          mapIdsByMember.get(assignment.memberId) ?? new Set<string>();

        memberMapIds.add(assignment.mapId);
        mapIdsByMember.set(assignment.memberId, memberMapIds);
      }

      for (const [memberId, mapIds] of mapIdsByMember) {
        const counts = respawnCountsByMember.get(memberId) ?? [];

        counts.push(mapIds.size);
        respawnCountsByMember.set(memberId, counts);
      }
    }

    return new Map(
      Array.from(respawnCountsByMember.entries()).map(([memberId, counts]) => {
        const totalMaps = counts.reduce((sum, value) => sum + value, 0);

        return [
          memberId,
          {
            maxMapsPerRespawn: Math.max(...counts, 0),
            avgMapsPerRespawn:
              counts.length > 0 ? roundToTwo(totalMaps / counts.length) : 0,
          },
        ];
      }),
    );
  }

  private aggregateHeroLoots(
    loots: LootQueryResult[],
    heroByName: Map<
      string,
      {
        id: string;
        npcName: string;
        npcIcon: string | null;
      }
    >,
  ): Map<string, HeroLootAggregate> {
    const heroLoots = new Map<string, HeroLootAggregate>();

    for (const loot of loots) {
      const matchingHeroes = loot.npcs
        .map((npc) => heroByName.get(npc.name.toLowerCase()))
        .filter((hero): hero is NonNullable<typeof hero> => Boolean(hero));

      if (matchingHeroes.length === 0) {
        continue;
      }

      for (const hero of matchingHeroes) {
        const existing = heroLoots.get(hero.id) ?? {
          totalLoots: 0,
          rarityTotals: createEmptyRarityTotals(),
        };

        existing.totalLoots += 1;
        for (const item of loot.items) {
          const rarityKey = getRarityKey(item.rarity);
          if (rarityKey) {
            existing.rarityTotals[rarityKey] += 1;
          }
        }

        heroLoots.set(hero.id, existing);
      }
    }

    return heroLoots;
  }

  private aggregateCoverage(
    summaries: SummaryRow[],
    heroes: Array<{
      id: string;
      npcName: string;
      npcIcon: string | null;
      maps: Array<{ id: string }>;
    }>,
  ): EventWrappedCoverageDto & {
    heroCoverageById: Map<string, EventWrappedHeroCoverageDto>;
  } {
    const heroCoverageById = new Map<string, EventWrappedHeroCoverageDto>();
    const heroCoverageTotals = new Map<
      string,
      {
        coveredSeconds: number;
        possibleSeconds: number;
        totalKills: number;
      }
    >();
    let totalWindowSeconds = 0;
    let totalCoverageSeconds = 0;
    let totalUncoveredSeconds = 0;
    let totalUnassignedSeconds = 0;
    let totalPossibleCoverageSeconds = 0;

    for (const hero of heroes) {
      heroCoverageById.set(hero.id, {
        heroNpcId: hero.id,
        npcName: hero.npcName,
        npcIcon: hero.npcIcon,
        mapCount: hero.maps.length,
        totalKills: 0,
        coveragePercentage: 0,
      });
      heroCoverageTotals.set(hero.id, {
        coveredSeconds: 0,
        possibleSeconds: 0,
        totalKills: 0,
      });
    }

    for (const summary of summaries) {
      const heroCoverage = heroCoverageById.get(summary.heroNpcId);
      const heroTotals = heroCoverageTotals.get(summary.heroNpcId);
      const mapCount =
        countMapStats(summary.mapStats) ?? heroCoverage?.mapCount ?? 0;

      totalWindowSeconds += summary.totalWindowSeconds;
      totalCoverageSeconds += summary.totalCoverageSeconds;
      totalUncoveredSeconds += summary.totalUncoveredSeconds;
      totalUnassignedSeconds += summary.totalUnassignedSeconds;
      totalPossibleCoverageSeconds += summary.totalWindowSeconds * mapCount;

      if (heroCoverage && heroTotals) {
        heroTotals.coveredSeconds += summary.totalCoverageSeconds;
        heroTotals.possibleSeconds += summary.totalWindowSeconds * mapCount;
        heroTotals.totalKills += 1;
      }
    }

    for (const hero of heroes) {
      const heroCoverage = heroCoverageById.get(hero.id);
      const heroTotals = heroCoverageTotals.get(hero.id);

      if (!heroCoverage || !heroTotals) {
        continue;
      }

      heroCoverage.totalKills = heroTotals.totalKills;
      heroCoverage.coveragePercentage =
        heroTotals.possibleSeconds > 0
          ? roundToTwo(
              (heroTotals.coveredSeconds / heroTotals.possibleSeconds) * 100,
            )
          : 0;
    }

    const coverageEntries = Array.from(heroCoverageById.values())
      .filter((entry) => entry.totalKills > 0)
      .sort(
        (left, right) => right.coveragePercentage - left.coveragePercentage,
      );

    return {
      totalWindowCount: summaries.length,
      totalWindowSeconds,
      totalCoverageSeconds,
      totalUncoveredSeconds,
      totalUnassignedSeconds,
      coveragePercentage:
        totalPossibleCoverageSeconds > 0
          ? roundToTwo(
              (totalCoverageSeconds / totalPossibleCoverageSeconds) * 100,
            )
          : 0,
      avgMapsPerSpawnWindow: 0,
      bestHeroCoverage: coverageEntries[0] ?? null,
      roughestHeroCoverage: coverageEntries[coverageEntries.length - 1] ?? null,
      heroCoverageById,
    };
  }

  private calculateAverageMapsPerSpawnWindow(
    kills: Array<{
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
    assignments: AssignmentRow[],
  ): number {
    if (kills.length === 0) {
      return 0;
    }

    let totalAssignedMapsAcrossWindows = 0;

    for (const kill of kills) {
      const assignedMaps = new Set<string>();
      for (const assignment of assignments) {
        const overlapsWindow =
          assignment.assignedAt <= kill.killedAt &&
          (assignment.unassignedAt === null ||
            assignment.unassignedAt >= kill.minSpawnTimeAtKill);

        if (overlapsWindow) {
          assignedMaps.add(assignment.mapId);
        }
      }

      totalAssignedMapsAcrossWindows += assignedMaps.size;
    }

    return totalAssignedMapsAcrossWindows / kills.length;
  }

  private selectLeader<
    T extends {
      memberId: number;
      member?: { id: number; name: string; avatar: string | null };
      name?: string;
      avatar?: string | null;
    },
  >(
    entries: T[],
    getPrimaryValue: (entry: T) => number,
    getSecondaryValue?: (entry: T) => number,
  ): EventWrappedLeaderDto | null {
    const sorted = [...entries]
      .map((entry) => ({
        entry,
        primaryValue: getPrimaryValue(entry),
        secondaryValue: getSecondaryValue ? getSecondaryValue(entry) : null,
      }))
      .sort((left, right) => {
        if (right.primaryValue !== left.primaryValue) {
          return right.primaryValue - left.primaryValue;
        }

        return (right.secondaryValue ?? 0) - (left.secondaryValue ?? 0);
      });

    const winner = sorted.find((entry) => entry.primaryValue > 0);
    if (!winner) {
      return null;
    }

    if ("member" in winner.entry && winner.entry.member) {
      return {
        memberId: winner.entry.member.id,
        name: winner.entry.member.name,
        avatar: winner.entry.member.avatar,
        primaryValue: roundToTwo(winner.primaryValue),
        secondaryValue:
          winner.secondaryValue !== null
            ? roundToTwo(winner.secondaryValue)
            : null,
      };
    }

    return {
      memberId: winner.entry.memberId,
      name: winner.entry.name ?? "Unknown",
      avatar: winner.entry.avatar ?? null,
      primaryValue: roundToTwo(winner.primaryValue),
      secondaryValue:
        winner.secondaryValue !== null
          ? roundToTwo(winner.secondaryValue)
          : null,
    };
  }
}
