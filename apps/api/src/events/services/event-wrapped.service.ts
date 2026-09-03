import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { Logger } from "#src/shared/logging/application-logger";
import type { Permission } from "@lootlog/schema/permissions";
import type {
  guildTable,
  itemSnapshotTable,
  roleTable,
} from "#src/database/drizzle/schema";
import type { LootQueryResult } from "#src/loots/dto/loot-query-result.dto";
import type { LootsOperations } from "#src/loots/loots.operations";
import { Clock, Effect } from "effect";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import { EventWrappedApiResponseDto_Output } from "#src/http-api/contracts/events/schemas";
import { clipToWindowSeconds } from "../utils/tracking-window.util.js";
import {
  EVENT_WRAPPED_CACHE_TTL_SECONDS,
  getEventWrappedCacheKey,
} from "#src/shared/constants/cache.constant";
import type {
  EventWrappedCoverageDto,
  EventWrappedHeroCoverageDto,
  EventWrappedHeroDto,
  EventWrappedLootHeroDto,
  EventWrappedRarityTotalsDto,
  EventWrappedResponseDto,
} from "../dto/event-wrapped.dto.js";
import { selectEventWrappedLeader } from "../utils/select-event-wrapped-leader.js";
import type { EventWrappedStore } from "./event-wrapped.repository.js";
type Guild = typeof guildTable.$inferSelect;
type ItemRarity = NonNullable<typeof itemSnapshotTable.$inferSelect.rarity>;
type Role = typeof roleTable.$inferSelect;

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

export const makeEventWrapped = (
  repository: EventWrappedStore,
  redis: RedisService,
  lootsService: LootsOperations,
) => {
  const logger = new Logger("EventWrapped");

  function getWrapped(
    guild: Guild,
    eventId: string,
    permissions: Permission[],
    roles: Role[],
  ) {
    const cacheKey = getEventWrappedCacheKey(
      guild.id,
      eventId,
      buildVisibilityCacheScope(permissions, roles),
    );

    const load = getWrappedUncached(guild, eventId, permissions, roles);
    return Effect.gen(function* () {
      const cached = yield* Effect.tryPromise({
        try: () =>
          redis.getJson(
            cacheKey,
            makeJsonCodec(EventWrappedApiResponseDto_Output),
          ),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            logger.warn("Event wrapped cache unavailable", error);
            return null;
          }),
        ),
      );
      if (cached !== null) return cached;
      const response = yield* load;
      yield* Effect.tryPromise({
        try: () =>
          redis.setJson(cacheKey, response, EVENT_WRAPPED_CACHE_TTL_SECONDS),
        catch: (error) => error,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() =>
            logger.warn("Event wrapped cache unavailable", error),
          ),
        ),
      );
      return response;
    }).pipe(Effect.withSpan("EventsCatalogController_showEventWrapped"));
  }

  function getWrappedUncached(
    guild: Guild,
    eventId: string,
    permissions: Permission[],
    roles: Role[],
  ) {
    return Effect.gen(function* () {
      const event = yield* repository.findEvent(guild.id, eventId);

      if (!event)
        return yield* Effect.fail(new ResourceNotFoundError("Event not found"));

      const eventWindowStart = event.startsAt ?? event.createdAt;
      const eventWindowEnd =
        event.endsAt ?? new Date(yield* Clock.currentTimeMillis);
      const heroIds = event.heroNpcs.map((hero) => hero.id);
      const heroByName = new Map(
        event.heroNpcs.map((hero) => [hero.npcName.toLowerCase(), hero]),
      );

      const [rankings, kills, windowSummaries, assignments, loots] =
        yield* Effect.all(
          [
            repository.findRankings(eventId),
            repository.findKills(heroIds),
            repository.findSummaries(heroIds),
            repository.findAssignments(heroIds),
            getEventLoots({
              guild,
              permissions,
              roles,
              world: event.world,
              heroNames: event.heroNpcs.map((hero) => hero.npcName),
              createdAtMin: eventWindowStart.toISOString(),
              createdAtMax: eventWindowEnd.toISOString(),
            }),
          ],
          { concurrency: "unbounded" },
        );

      const members = aggregateMembers(
        rankings as RankingRow[],
        assignments as AssignmentRow[],
        kills,
        {
          eventWindowStart,
          eventWindowEnd,
        },
      );
      const heroLoots = aggregateHeroLoots(loots, heroByName);
      const coverage = aggregateCoverage(
        windowSummaries as SummaryRow[],
        event.heroNpcs,
      );
      const avgMapsPerSpawnWindow = calculateAverageMapsPerSpawnWindow(
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
          const topHunter = selectEventWrappedLeader(
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
        generatedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
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
          topHunter: selectEventWrappedLeader(
            memberList,
            (member) => member.totalKills,
          ),
          topScorer: selectEventWrappedLeader(
            memberList,
            (member) => member.totalPoints,
          ),
          longestDuty: selectEventWrappedLeader(
            memberList,
            (member) => member.totalAssignedSeconds,
          ),
          topAfk: selectEventWrappedLeader(
            memberList,
            (member) => member.totalAfkSeconds,
          ),
          mostFlexible: selectEventWrappedLeader(
            memberList,
            (member) => member.maxMapsPerRespawn,
            (member) => member.avgMapsPerRespawn,
          ),
          topEfficiency: selectEventWrappedLeader(
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

      return response;
    });
  }

  function buildVisibilityCacheScope(permissions: Permission[], roles: Role[]) {
    const visibilityScope = {
      permissions: [...permissions].sort(),
      roles: roles
        .map((role) => ({
          id: role.id,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
          permissions: [...role.permissions].sort(),
        }))
        .sort((leftRole, rightRole) => leftRole.id.localeCompare(rightRole.id)),
    };

    return Buffer.from(stableSerialize(visibilityScope)).toString("base64url");
  }

  function stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }

  function getEventLoots(params: {
    guild: Guild;
    permissions: Permission[];
    roles: Role[];
    world: string;
    heroNames: string[];
    createdAtMin: string;
    createdAtMax: string;
  }) {
    if (params.heroNames.length === 0) {
      return Effect.succeed([] as LootQueryResult[]);
    }

    const accessPolicy = createAccessPolicy({
      capabilities: params.permissions,
    });
    const fetchLootsBatch = (
      cursor: number | undefined,
      collectedLoots: LootQueryResult[],
    ): Effect.Effect<LootQueryResult[], unknown, never> =>
      Effect.gen(function* () {
        const batch = yield* lootsService.fetchLootsByGuildId(
          params.guild,
          accessPolicy,
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

        return yield* fetchLootsBatch(nextCursor, collectedLoots);
      });

    return fetchLootsBatch(undefined, []);
  }

  function aggregateMembers(
    rankings: RankingRow[],
    assignments: AssignmentRow[],
    kills: Array<{
      killedAt: Date;
      minSpawnTimeAtKill: Date;
    }>,
    options: { eventWindowStart: Date; eventWindowEnd: Date },
  ): Map<number, AggregatedMember> {
    const members = new Map<number, AggregatedMember>();
    const respawnStatsByMemberId = calculateMemberRespawnMapStats(
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

  function calculateMemberRespawnMapStats(
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

  function aggregateHeroLoots(
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

  function aggregateCoverage(
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

  function calculateAverageMapsPerSpawnWindow(
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

  return { getWrapped };
};

export type EventWrapped = ReturnType<typeof makeEventWrapped>;
