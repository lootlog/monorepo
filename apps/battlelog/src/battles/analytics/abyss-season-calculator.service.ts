import type { AbyssSeason } from "#src/battles/analytics/battle-statistics-response";
import { battleAnalyticsDomain as domain } from "#src/battles/analytics/battle-analytics-domain.service";
import type { InflatedBattleWithWarriors } from "#src/battles/analytics/battle-analytics.types";

const ABYSS_SEASON_GAP_MS = 14 * 24 * 60 * 60 * 1000;

export const abyssSeasonCalculator = {
  calculateSeasons(
    sortedBattles: InflatedBattleWithWarriors[],
    characterIds: Set<string>,
  ): AbyssSeason[] {
    const seasons: AbyssSeason[] = [];
    let seasonBattles: InflatedBattleWithWarriors[] = [];

    for (const battle of sortedBattles) {
      const previousBattle = seasonBattles.at(-1);
      const startsNewSeason =
        previousBattle &&
        battle.createdAt.getTime() - previousBattle.createdAt.getTime() >
          ABYSS_SEASON_GAP_MS;

      if (startsNewSeason) {
        seasons.push(buildSeasonSummary(seasonBattles, characterIds));
        seasonBattles = [];
      }

      seasonBattles.push(battle);
    }

    if (seasonBattles.length > 0) {
      seasons.push(buildSeasonSummary(seasonBattles, characterIds));
    }

    return seasons.reverse();
  },
};

const buildSeasonSummary = (
  seasonBattles: InflatedBattleWithWarriors[],
  characterIds: Set<string>,
): AbyssSeason => {
  const firstBattle = seasonBattles[0]!;
  const lastBattle = seasonBattles[seasonBattles.length - 1]!;
  let wins = 0;
  let losses = 0;
  let totalRatingDelta = 0;
  let peakRating: number | null = null;
  let totalPointsGained = 0;
  let hasPoints = false;

  for (const battle of seasonBattles) {
    const userWarrior = domain.findUserWarrior(battle, characterIds);

    if (userWarrior && !battle.hasFlee) {
      if (userWarrior.team === battle.winningTeam) {
        wins++;
      } else if (userWarrior.team === battle.losingTeam) {
        losses++;
      }
    }

    totalRatingDelta += battle.ratingDelta ?? 0;

    if (battle.rating !== null && battle.rating !== undefined) {
      peakRating =
        peakRating === null
          ? battle.rating
          : Math.max(peakRating, battle.rating);
    }

    if (battle.pointsGained !== null && battle.pointsGained !== undefined) {
      totalPointsGained += battle.pointsGained;
      hasPoints = true;
    }
  }

  const resolvedBattles = wins + losses;

  return {
    id: `abyss-${firstBattle.createdAt.getTime()}-${lastBattle.createdAt.getTime()}`,
    startedAt: firstBattle.createdAt.toISOString(),
    endedAt: lastBattle.createdAt.toISOString(),
    totalBattles: seasonBattles.length,
    wins,
    losses,
    winRate:
      resolvedBattles > 0
        ? Math.round((wins / resolvedBattles) * 10000) / 100
        : 0,
    totalRatingDelta,
    peakRating,
    totalPointsGained: hasPoints ? totalPointsGained : null,
  };
};
