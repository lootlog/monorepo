import { roundEventDisplayValue } from "#src/events/round-event-display-value";
import { clipToWindowSeconds } from "#src/events/monitoring/tracking-window";
import type { LootNpcNameSummary } from "#src/loots/query/loot-query.operations";
import type {
  EventWrappedCoverageDto,
  EventWrappedHeroCoverageDto,
  EventWrappedRarityTotalsDto,
} from "#src/events/wrapped/event-wrapped.model";
import type { MemberRespawnMapStats } from "#src/events/wrapped/event-wrapped.spawn-windows";
import type { MemberSummary } from "#src/contracts/shared";

type RankingRow = {
  memberId: number;
  heroNpcName: string;
  totalPoints: number;
  totalKills: number;
  totalTimeSeconds: number;
  avgAfkPercentage: number;
  member: MemberSummary;
};

type AssignmentRow = {
  mapId: string;
  heroNpcId: string;
  memberId: number;
  assignedAt: Date;
  unassignedAt: Date | null;
  member: MemberSummary;
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
  member: MemberSummary;
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

export const createEmptyRarityTotals = (): EventWrappedRarityTotalsDto => ({
  unique: 0,
  heroic: 0,
  legendary: 0,
});

const countMapStats = (mapStats: unknown): number => {
  return Array.isArray(mapStats) ? mapStats.length : 0;
};

export function aggregateMembers(
  rankings: RankingRow[],
  assignments: AssignmentRow[],
  respawnStatsByMemberId: ReadonlyMap<number, MemberRespawnMapStats>,
  options: { eventWindowStart: Date; eventWindowEnd: Date },
): Map<number, AggregatedMember> {
  const members = new Map<number, AggregatedMember>();

  for (const ranking of rankings) {
    const existing = members.get(ranking.memberId) ?? {
      member: ranking.member,
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
      member: assignment.member,
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

export function aggregateHeroLoots(
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

  for (const npc of npcs) {
    const hero = heroByName.get(npc.name.toLowerCase());

    if (!hero) continue;

    const existing = heroLoots.get(hero.id) ?? {
      totalLoots: 0,
      rarityTotals: createEmptyRarityTotals(),
    };

    existing.totalLoots += npc.encounters;
    existing.rarityTotals.unique += npc.unique ?? 0;
    existing.rarityTotals.heroic += npc.heroic ?? 0;
    existing.rarityTotals.legendary += npc.legendary ?? 0;
    heroLoots.set(hero.id, existing);
  }

  return heroLoots;
}

export function aggregateCoverage(
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
    .sort((left, right) => right.coveragePercentage - left.coveragePercentage);

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
