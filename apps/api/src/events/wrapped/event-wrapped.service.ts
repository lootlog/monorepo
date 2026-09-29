import { buildLootVisibilityCacheScope } from "#src/loots/loot-visibility-cache";
import { roundEventDisplayValue } from "#src/events/round-event-display-value";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { Logger } from "#src/shared/application-logger";
import type { Permission } from "@lootlog/schema/permissions";
import { stableJsonCacheKey } from "@lootlog/schema/stable-json";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type { LootNpcNameSummary } from "#src/loots/query/loot-query.operations";
import type { LootsOperations } from "#src/loots/loots.operations";
import { Clock, Effect } from "effect";
import { makeJsonCodec, RedisService } from "#src/redis/redis.service";
import { EventWrappedResponse } from "#src/contracts/events/schemas";
import { clipToWindowSeconds } from "#src/events/monitoring/tracking-window";
import {
  EVENT_WRAPPED_CACHE_TTL_SECONDS,
  getEventWrappedCacheKey,
} from "#src/shared/cache";
import type {
  EventWrappedCoverageDto,
  EventWrappedHeroCoverageDto,
  EventWrappedHeroDto,
  EventWrappedLootHeroDto,
  EventWrappedRarityTotalsDto,
  EventWrappedResponseDto,
} from "#src/events/wrapped/event-wrapped.model";
import { selectEventWrappedLeader } from "#src/events/wrapped/select-event-wrapped-leader";
import type { EventWrappedStore } from "#src/events/wrapped/event-wrapped.repository";

type Guild = typeof guildTable.$inferSelect;

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
  totalAssignedSeconds: number;
  maxMapsPerRespawn: number;
  avgMapsPerRespawn: number;
};

type HeroLootAggregate = {
  totalLoots: number;
  rarityTotals: EventWrappedRarityTotalsDto;
};

type SpawnWindow = {
  killedAt: Date;
  minSpawnTimeAtKill: Date;
};

type AssignmentInterval = Pick<
  AssignmentRow,
  "mapId" | "memberId" | "assignedAt" | "unassignedAt"
>;

type MemberRespawnMapStats = {
  maxMapsPerRespawn: number;
  avgMapsPerRespawn: number;
};

type SpawnWindowCoverage = {
  minSpawnTime: number;
  mapIds: Set<string>;
  mapIdsByMember: Map<number, Set<string>>;
};

// Events sharing a timestamp run in this order, which makes both interval
// bounds inclusive: an assignment starting at a window's minimum spawn time or
// ending at it, or starting at the kill, still covers the window.
const SweepStep = {
  assignmentStart: 0,
  windowOpen: 1,
  windowClose: 2,
  assignmentEnd: 3,
} as const;

type AssignmentStep =
  | typeof SweepStep.assignmentStart
  | typeof SweepStep.assignmentEnd;

type WindowStep = typeof SweepStep.windowOpen | typeof SweepStep.windowClose;

type SweepEvent =
  | { at: number; step: AssignmentStep; assignment: AssignmentInterval }
  | { at: number; step: WindowStep; window: SpawnWindowCoverage };

const createEmptyRarityTotals = (): EventWrappedRarityTotalsDto => ({
  unique: 0,
  heroic: 0,
  legendary: 0,
});

const countMapStats = (mapStats: unknown): number => {
  return Array.isArray(mapStats) ? mapStats.length : 0;
};

const endsAtOrAfter = (end: Date | null, time: number) =>
  end === null || end.getTime() >= time;

/**
 * Counts the maps assigned during each kill's spawn window, in total and per
 * member. An assignment covers a window when it starts no later than the kill
 * and is still open or ends no earlier than the minimum spawn time. A window
 * whose minimum spawn time follows its kill is covered only by an assignment
 * spanning that whole inverted range.
 *
 * One sweep over the sorted start and end times replaces a scan of every
 * assignment per kill: each window reads the assignments active when it opens,
 * and each later assignment start reaches only the windows open at that time.
 */
const summarizeSpawnWindowAssignments = (
  kills: ReadonlyArray<SpawnWindow>,
  assignments: ReadonlyArray<AssignmentInterval>,
) => {
  const events: SweepEvent[] = [];

  for (const assignment of assignments) {
    events.push({
      at: assignment.assignedAt.getTime(),
      step: SweepStep.assignmentStart,
      assignment,
    });

    if (assignment.unassignedAt !== null) {
      events.push({
        at: assignment.unassignedAt.getTime(),
        step: SweepStep.assignmentEnd,
        assignment,
      });
    }
  }

  for (const kill of kills) {
    const killedAt = kill.killedAt.getTime();

    const window: SpawnWindowCoverage = {
      minSpawnTime: kill.minSpawnTimeAtKill.getTime(),
      mapIds: new Set(),
      mapIdsByMember: new Map(),
    };

    // An inverted window opens at its kill and closes immediately.
    events.push({
      at: Math.min(window.minSpawnTime, killedAt),
      step: SweepStep.windowOpen,
      window,
    });

    if (window.minSpawnTime <= killedAt) {
      events.push({ at: killedAt, step: SweepStep.windowClose, window });
    }
  }

  events.sort((left, right) => left.at - right.at || left.step - right.step);

  // Assignments that started and have not ended. One that ends before it
  // starts never becomes active; it can only reach windows already open.
  const activeAssignments = new Set<AssignmentInterval>();

  const openWindows = new Set<SpawnWindowCoverage>();

  const memberTotals = new Map<
    number,
    { windowCount: number; totalMaps: number; maxMaps: number }
  >();

  let totalAssignedMaps = 0;

  const cover = (
    window: SpawnWindowCoverage,
    assignment: AssignmentInterval,
  ) => {
    window.mapIds.add(assignment.mapId);

    const memberMapIds =
      window.mapIdsByMember.get(assignment.memberId) ?? new Set<string>();

    memberMapIds.add(assignment.mapId);
    window.mapIdsByMember.set(assignment.memberId, memberMapIds);
  };

  const close = (window: SpawnWindowCoverage) => {
    totalAssignedMaps += window.mapIds.size;

    for (const [memberId, mapIds] of window.mapIdsByMember) {
      const totals = memberTotals.get(memberId) ?? {
        windowCount: 0,
        totalMaps: 0,
        maxMaps: 0,
      };

      totals.windowCount += 1;
      totals.totalMaps += mapIds.size;
      totals.maxMaps = Math.max(totals.maxMaps, mapIds.size);
      memberTotals.set(memberId, totals);
    }
  };

  for (const event of events) {
    if (event.step === SweepStep.assignmentStart) {
      const { assignment } = event;

      for (const window of openWindows) {
        if (endsAtOrAfter(assignment.unassignedAt, window.minSpawnTime)) {
          cover(window, assignment);
        }
      }

      if (endsAtOrAfter(assignment.unassignedAt, event.at)) {
        activeAssignments.add(assignment);
      }
    } else if (event.step === SweepStep.assignmentEnd) {
      activeAssignments.delete(event.assignment);
    } else if (event.step === SweepStep.windowClose) {
      openWindows.delete(event.window);
      close(event.window);
    } else if (event.step === SweepStep.windowOpen) {
      const { window } = event;

      for (const assignment of activeAssignments) {
        if (endsAtOrAfter(assignment.unassignedAt, window.minSpawnTime)) {
          cover(window, assignment);
        }
      }

      if (window.minSpawnTime > event.at) {
        close(window);
      } else {
        openWindows.add(window);
      }
    }
  }

  return {
    avgMapsPerSpawnWindow:
      kills.length > 0 ? totalAssignedMaps / kills.length : 0,
    memberStats: new Map(
      Array.from(memberTotals, ([memberId, totals]) => [
        memberId,
        {
          maxMapsPerRespawn: totals.maxMaps,
          avgMapsPerRespawn: roundEventDisplayValue(
            totals.totalMaps / totals.windowCount,
          ),
        } satisfies MemberRespawnMapStats,
      ]),
    ),
  };
};

export const makeEventWrapped = (
  repository: EventWrappedStore,
  redis: Pick<RedisService, "getJson" | "setJson">,
  lootsService: Pick<LootsOperations, "summarizeLootsByNpcName">,
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
      stableJsonCacheKey(buildLootVisibilityCacheScope(permissions, roles)),
    );

    const load = getWrappedUncached(guild, eventId, permissions, roles);

    return Effect.gen(function* () {
      const cached = yield* Effect.tryPromise({
        try: () => redis.getJson(cacheKey, makeJsonCodec(EventWrappedResponse)),
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

      const [rankings, kills, windowSummaries, assignments, lootSummary] =
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

      const { avgMapsPerSpawnWindow, memberStats } =
        summarizeSpawnWindowAssignments(kills, assignments);

      const members = aggregateMembers(rankings, assignments, memberStats, {
        eventWindowStart,
        eventWindowEnd,
      });

      const heroLoots = aggregateHeroLoots(lootSummary.npcs, heroByName);
      const coverage = aggregateCoverage(windowSummaries, event.heroNpcs);

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
            totalPoints: roundEventDisplayValue(totalPoints),
            coveragePercentage: roundEventDisplayValue(
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

      const totalLoots = lootSummary.lootCount;

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
          totalPoints: roundEventDisplayValue(totalPoints),
          totalTrackedSeconds,
          totalAfkSeconds,
          coveragePercentage: roundEventDisplayValue(
            coverage.coveragePercentage,
          ),
          avgMapsPerSpawnWindow: roundEventDisplayValue(avgMapsPerSpawnWindow),
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
          coveragePercentage: roundEventDisplayValue(
            coverage.coveragePercentage,
          ),
          avgMapsPerSpawnWindow: roundEventDisplayValue(avgMapsPerSpawnWindow),
          bestHeroCoverage: coverage.bestHeroCoverage,
          roughestHeroCoverage: coverage.roughestHeroCoverage,
        },
        heroes: heroEntries,
        loot: {
          totalLoots,
          rarityTotals: totalRarityTotals,
          heroBreakdown: event.heroNpcs
            .map((hero): EventWrappedLootHeroDto => ({
              heroNpcId: hero.id,
              npcName: hero.npcName,
              npcIcon: hero.npcIcon,
              totalLoots: heroLoots.get(hero.id)?.totalLoots ?? 0,
              rarityTotals:
                heroLoots.get(hero.id)?.rarityTotals ??
                createEmptyRarityTotals(),
            }))
            .sort((left, right) => right.totalLoots - left.totalLoots),
        },
      };

      return response;
    });
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
      return Effect.succeed<LootNpcNameSummary>({ lootCount: 0, npcs: [] });
    }

    return lootsService.summarizeLootsByNpcName(
      params.guild,
      createAccessPolicy({ capabilities: params.permissions }),
      params.roles,
      {
        npcs: params.heroNames,
        world: params.world,
        createdAtMin: params.createdAtMin,
        createdAtMax: params.createdAtMax,
      },
    );
  }

  function aggregateMembers(
    rankings: RankingRow[],
    assignments: AssignmentRow[],
    respawnStatsByMemberId: ReadonlyMap<number, MemberRespawnMapStats>,
    options: { eventWindowStart: Date; eventWindowEnd: Date },
  ): Map<number, AggregatedMember> {
    const members = new Map<number, AggregatedMember>();

    for (const ranking of rankings) {
      const existing = members.get(ranking.memberId) ?? {
        memberId: ranking.member.id,
        name: ranking.member.name,
        avatar: ranking.member.avatar,
        totalPoints: 0,
        totalKills: 0,
        totalTimeSeconds: 0,
        totalAfkSeconds: 0,
        totalAssignedSeconds: 0,
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
        totalAssignedSeconds: 0,
        maxMapsPerRespawn: 0,
        avgMapsPerRespawn: 0,
      };

      const durationSeconds = clipToWindowSeconds({
        start: assignment.assignedAt,
        end: assignment.unassignedAt,
        windowStart: options.eventWindowStart,
        windowEnd: options.eventWindowEnd,
      });

      existing.totalAssignedSeconds += durationSeconds;

      members.set(assignment.memberId, existing);
    }

    for (const [memberId, existing] of members) {
      const respawnStats = respawnStatsByMemberId.get(memberId);

      existing.maxMapsPerRespawn = respawnStats?.maxMapsPerRespawn ?? 0;
      existing.avgMapsPerRespawn = respawnStats?.avgMapsPerRespawn ?? 0;
    }

    return members;
  }

  function aggregateHeroLoots(
    npcs: LootNpcNameSummary["npcs"],
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

    // A loot counts once for each of its NPC rows naming an event hero, so a
    // hero listed twice in one encounter counts that loot and its items twice.
    for (const npc of npcs) {
      const hero = heroByName.get(npc.name.toLowerCase());

      if (!hero) continue;

      const existing = heroLoots.get(hero.id) ?? {
        totalLoots: 0,
        rarityTotals: createEmptyRarityTotals(),
      };

      existing.totalLoots += npc.encounters;
      existing.rarityTotals.unique += npc.unique;
      existing.rarityTotals.heroic += npc.heroic;
      existing.rarityTotals.legendary += npc.legendary;
      heroLoots.set(hero.id, existing);
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
          ? roundEventDisplayValue(
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
          ? roundEventDisplayValue(
              (totalCoverageSeconds / totalPossibleCoverageSeconds) * 100,
            )
          : 0,
      avgMapsPerSpawnWindow: 0,
      bestHeroCoverage: coverageEntries[0] ?? null,
      roughestHeroCoverage: coverageEntries[coverageEntries.length - 1] ?? null,
      heroCoverageById,
    };
  }

  return { getWrapped };
};

export type EventWrapped = ReturnType<typeof makeEventWrapped>;
