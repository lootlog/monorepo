// In-memory reference for the SQL analytics reads. It reproduces the
// calculators the SQL reads replaced so the read spec can compare both over
// the same PostgreSQL rows. Keep it semantically frozen: a change here moves
// the golden expectation, not the production behavior. The combat profile
// reference reuses the production accumulator, so its parity covers row
// selection, not the aggregation arithmetic.
import { orderBy } from "es-toolkit";
import type {
  AbyssSeason,
  BattleDurationStats,
  BattleStreak,
  CombatProfile,
  HeadToHeadRecord,
  PhGrowthDataPoint,
  PlayerVsPlayerBattle,
  RatingDeltaByOpponent,
  RatingGrowthDataPoint,
} from "#src/battles/analytics/battle-statistics-response";
import { combatProfileCalculator } from "#src/battles/analytics/combat-profile-calculator.service";
import type { Battle, BattleWarrior } from "#src/database/schema";

export type BattleWithWarriors = Battle & { warriors: BattleWarrior[] };

type Battles = BattleWithWarriors[];

const ABYSS_SEASON_GAP_MS = 14 * 24 * 60 * 60 * 1000;

const EMPTY_WARRIOR = {
  name: "",
  lvl: 0,
  prof: "",
  icon: "",
  fireDamage: 0,
  frostDamage: 0,
  lightningDamage: 0,
  poisonDamageTaken: 0,
  woundDamageTaken: 0,
  critWoundDamageTaken: 0,
};

const findUserWarrior = (
  battle: BattleWithWarriors,
  characterIds: Set<string>,
): BattleWarrior | undefined =>
  orderBy(
    battle.warriors.filter((warrior) => characterIds.has(warrior.originalId)),
    [(warrior) => warrior.originalId === battle.characterId, "originalId"],
    ["desc", "asc"],
  )[0];

const findOpponentWarrior = (
  battle: BattleWithWarriors,
  characterIds: Set<string>,
): BattleWarrior | undefined =>
  orderBy(
    battle.warriors.filter((warrior) => !characterIds.has(warrior.originalId)),
    ["originalId"],
    ["asc"],
  )[0];

const mapWarrior = (warrior: BattleWarrior | undefined) => {
  const resolved = warrior ?? EMPTY_WARRIOR;

  return {
    name: resolved.name,
    lvl: resolved.lvl,
    prof: resolved.prof,
    icon: resolved.icon,
    fireDamage: resolved.fireDamage,
    frostDamage: resolved.frostDamage,
    lightningDamage: resolved.lightningDamage,
    poisonDamageTaken: resolved.poisonDamageTaken,
    woundDamageTaken: resolved.woundDamageTaken,
    critWoundDamageTaken: resolved.critWoundDamageTaken,
  };
};

const isLevelInRange = (level: number, minLevel?: number, maxLevel?: number) =>
  (minLevel === undefined || level >= minLevel) &&
  (maxLevel === undefined || level <= maxLevel);

const isOpponentLevelInRange = (
  battle: BattleWithWarriors,
  characterIds: Set<string>,
  minLevel?: number,
  maxLevel?: number,
) => {
  if (battle.type !== "1v1") return false;
  const opponent = findOpponentWarrior(battle, characterIds);

  return (
    opponent !== undefined && isLevelInRange(opponent.lvl, minLevel, maxLevel)
  );
};

const averageRatingDelta = (total: number, battlesWithRating: number) =>
  battlesWithRating > 0
    ? Math.round((total / battlesWithRating) * 100) / 100
    : 0;

export const legacyBattleAnalytics = {
  filterByOpponentLevel(
    battles: Battles,
    characterIds: Set<string>,
    minLevel?: number,
    maxLevel?: number,
  ): Battles {
    if (minLevel === undefined && maxLevel === undefined) return battles;

    return battles.filter((battle) =>
      isOpponentLevelInRange(battle, characterIds, minLevel, maxLevel),
    );
  },

  filterByAnyOpponentLevel(
    battles: Battles,
    characterIds: Set<string>,
    minLevel?: number,
    maxLevel?: number,
  ): Battles {
    if (minLevel === undefined && maxLevel === undefined) return battles;

    return battles.filter((battle) =>
      battle.warriors.some(
        (warrior) =>
          !characterIds.has(warrior.originalId) &&
          isLevelInRange(warrior.lvl, minLevel, maxLevel),
      ),
    );
  },

  currentStreak(newestFirst: Battles, characterIds: Set<string>): BattleStreak {
    let currentStreak = 0;
    let currentType: "wins" | "losses" | "none" = "none";
    let longestWins = 0;
    let longestLosses = 0;
    let winRun = 0;
    let lossRun = 0;
    let isCurrentActive = true;

    for (const battle of newestFirst) {
      const userWarrior = findUserWarrior(battle, characterIds);

      if (!userWarrior) continue;
      const isWin = userWarrior.team === battle.winningTeam;

      if (isCurrentActive) {
        if (currentType === "none") {
          currentType = isWin ? "wins" : "losses";
          currentStreak = 1;
        } else if ((currentType === "wins") === isWin) {
          currentStreak++;
        } else {
          isCurrentActive = false;
        }
      }

      if (isWin) {
        winRun++;
        longestWins = Math.max(longestWins, winRun);
        lossRun = 0;
      } else {
        lossRun++;
        longestLosses = Math.max(longestLosses, lossRun);
        winRun = 0;
      }
    }

    return {
      current: { type: currentType, count: currentStreak },
      longest: { wins: longestWins, losses: longestLosses },
    };
  },

  durationStats(
    byDuration: Battles,
    characterIds: Set<string>,
  ): BattleDurationStats {
    let winDuration = 0;
    let lossDuration = 0;
    let winCount = 0;
    let lossCount = 0;

    for (const battle of byDuration) {
      const userWarrior = findUserWarrior(battle, characterIds);

      if (!userWarrior) continue;

      if (userWarrior.team === battle.winningTeam) {
        winDuration += battle.duration;
        winCount++;
      } else {
        lossDuration += battle.duration;
        lossCount++;
      }
    }

    const fastest = byDuration[0];
    const longest = byDuration.at(-1);

    return {
      avgWinDuration: winCount > 0 ? Math.round(winDuration / winCount) : 0,
      avgLossDuration: lossCount > 0 ? Math.round(lossDuration / lossCount) : 0,
      fastest: fastest
        ? { duration: fastest.duration, battleId: fastest.id }
        : null,
      longest: longest
        ? { duration: longest.duration, battleId: longest.id }
        : null,
    };
  },

  phGrowth(
    oldestFirst: Battles,
    characterIds: Set<string>,
  ): PhGrowthDataPoint[] {
    let cumulativePh = 0;

    return oldestFirst.map((battle) => {
      const ph = findUserWarrior(battle, characterIds)?.ph ?? 0;
      cumulativePh += ph;

      return {
        date: battle.createdAt.toISOString(),
        ph,
        cumulativePh,
        battleId: battle.id,
      };
    });
  },

  ratingGrowth(oldestFirst: Battles): RatingGrowthDataPoint[] {
    return oldestFirst.map((battle) => ({
      date: battle.createdAt.toISOString(),
      ratingDelta: battle.ratingDelta ?? 0,
      rating: battle.rating ?? 0,
      battleId: battle.id,
    }));
  },

  ratingDeltaByOpponent(
    newestFirst: Battles,
    characterIds: Set<string>,
  ): RatingDeltaByOpponent[] {
    const opponents = new Map<
      string,
      {
        warrior: BattleWarrior;
        totalRatingDelta: number;
        wins: number;
        losses: number;
        lastBattleDate: Date;
        battlesWithRating: number;
      }
    >();

    for (const battle of newestFirst) {
      const userWarrior = findUserWarrior(battle, characterIds);
      const opponentWarrior = findOpponentWarrior(battle, characterIds);

      if (!userWarrior || !opponentWarrior || battle.ratingDelta === null)
        continue;

      const stats = opponents.get(opponentWarrior.originalId) ?? {
        warrior: opponentWarrior,
        totalRatingDelta: 0,
        wins: 0,
        losses: 0,
        lastBattleDate: battle.createdAt,
        battlesWithRating: 0,
      };

      stats.totalRatingDelta += battle.ratingDelta;

      if (battle.ratingDelta !== 0) stats.battlesWithRating++;

      if (userWarrior.team === battle.winningTeam) stats.wins++;
      else if (userWarrior.team === battle.losingTeam) stats.losses++;

      if (battle.createdAt > stats.lastBattleDate)
        stats.lastBattleDate = battle.createdAt;
      opponents.set(opponentWarrior.originalId, stats);
    }

    return Array.from(opponents, ([opponentId, stats]) => ({
      opponentId,
      opponentName: stats.warrior.name,
      opponentIcon: stats.warrior.icon,
      opponentProf: stats.warrior.prof,
      opponentLvl: stats.warrior.lvl,
      totalRatingDelta: stats.totalRatingDelta,
      wins: stats.wins,
      losses: stats.losses,
      totalBattles: stats.wins + stats.losses,
      avgRatingDelta: averageRatingDelta(
        stats.totalRatingDelta,
        stats.battlesWithRating,
      ),
      lastBattleDate: stats.lastBattleDate.toISOString(),
    })).sort((left, right) => right.totalRatingDelta - left.totalRatingDelta);
  },

  // Aggregation only: search, minBattles and sorting are asserted separately
  // with hand-written expectations.
  headToHeadRecords(
    newestFirst: Battles,
    characterIds: Set<string>,
    matchmaking: boolean | undefined,
  ): HeadToHeadRecord[] {
    const opponents = new Map<
      string,
      {
        battle: BattleWithWarriors;
        userWarrior: BattleWarrior;
        opponentWarrior: BattleWarrior;
        wins: number;
        losses: number;
        totalRatingDelta: number;
        battlesWithRating: number;
      }
    >();

    for (const battle of newestFirst) {
      const userWarrior = findUserWarrior(battle, characterIds);
      const opponentWarrior = findOpponentWarrior(battle, characterIds);

      if (!userWarrior || !opponentWarrior) continue;
      const existing = opponents.get(opponentWarrior.originalId);

      const stats = existing ?? {
        battle,
        userWarrior,
        opponentWarrior,
        wins: 0,
        losses: 0,
        totalRatingDelta: 0,
        battlesWithRating: 0,
      };

      if (userWarrior.team === battle.winningTeam) stats.wins++;
      else if (userWarrior.team === battle.losingTeam) stats.losses++;

      if (matchmaking && battle.ratingDelta !== null) {
        stats.totalRatingDelta += battle.ratingDelta;

        if (battle.ratingDelta !== 0) stats.battlesWithRating++;
      }

      if (existing && battle.createdAt > stats.battle.createdAt)
        Object.assign(stats, { battle, userWarrior, opponentWarrior });
      opponents.set(opponentWarrior.originalId, stats);
    }

    return Array.from(opponents, ([opponentId, stats]) => {
      const totalBattles = stats.wins + stats.losses;

      return {
        opponentId,
        opponentName: stats.opponentWarrior.name,
        opponentIcon: stats.opponentWarrior.icon,
        opponentProf: stats.opponentWarrior.prof,
        opponentLvl: stats.opponentWarrior.lvl,
        lastBattleResult: stats.battle.hasFlee
          ? "flee"
          : stats.userWarrior.team === stats.battle.winningTeam
            ? "won"
            : "lost",
        lastBattleUserWarrior: mapWarrior(stats.userWarrior),
        lastBattleOpponentWarrior: mapWarrior(stats.opponentWarrior),
        wins: stats.wins,
        losses: stats.losses,
        totalBattles,
        winRate: totalBattles > 0 ? (stats.wins / totalBattles) * 100 : 0,
        lastBattleDate: stats.battle.createdAt.toISOString(),
        totalRatingDelta: matchmaking ? stats.totalRatingDelta : undefined,
        avgRatingDelta: matchmaking
          ? averageRatingDelta(stats.totalRatingDelta, stats.battlesWithRating)
          : undefined,
      };
    });
  },

  seasons(oldestFirst: Battles, characterIds: Set<string>): AbyssSeason[] {
    const seasons: Battles[] = [];

    for (const battle of oldestFirst) {
      const current = seasons.at(-1);
      const previous = current?.at(-1);

      if (
        current &&
        previous &&
        battle.createdAt.getTime() - previous.createdAt.getTime() <=
          ABYSS_SEASON_GAP_MS
      )
        current.push(battle);
      else seasons.push([battle]);
    }

    return seasons
      .map((season) => {
        const first = season[0];
        const last = season[season.length - 1];
        let wins = 0;
        let losses = 0;
        let totalRatingDelta = 0;
        let peakRating: number | null = null;
        let totalPointsGained: number | null = null;

        for (const battle of season) {
          const userWarrior = findUserWarrior(battle, characterIds);

          if (userWarrior && !battle.hasFlee) {
            if (userWarrior.team === battle.winningTeam) wins++;
            else if (userWarrior.team === battle.losingTeam) losses++;
          }

          totalRatingDelta += battle.ratingDelta ?? 0;

          if (battle.rating !== null)
            peakRating = Math.max(peakRating ?? battle.rating, battle.rating);

          if (battle.pointsGained !== null)
            totalPointsGained = (totalPointsGained ?? 0) + battle.pointsGained;
        }

        const resolved = wins + losses;

        return {
          id: `abyss-${first.createdAt.getTime()}-${last.createdAt.getTime()}`,
          startedAt: first.createdAt.toISOString(),
          endedAt: last.createdAt.toISOString(),
          totalBattles: season.length,
          wins,
          losses,
          winRate:
            resolved > 0 ? Math.round((wins / resolved) * 10000) / 100 : 0,
          totalRatingDelta,
          peakRating,
          totalPointsGained,
        };
      })
      .reverse();
  },

  playerVsPlayerBattles(
    newestFirst: Battles,
    characterIds: Set<string>,
    query: {
      opponentId: string;
      excludeBattleId?: string;
      minLevel?: number;
      maxLevel?: number;
    },
  ): PlayerVsPlayerBattle[] {
    return newestFirst
      .filter(
        (battle) =>
          battle.type === "1v1" &&
          battle.id !== query.excludeBattleId &&
          battle.warriors.some(
            (warrior) => warrior.originalId === query.opponentId,
          ) &&
          isOpponentLevelInRange(
            battle,
            characterIds,
            query.minLevel,
            query.maxLevel,
          ),
      )
      .map((battle) => ({
        battleId: battle.id,
        createdAt: battle.createdAt.toISOString(),
        duration: battle.duration,
        winner: battle.winner,
        loser: battle.loser,
        hasFlee: battle.hasFlee,
        matchmaking: battle.matchmaking,
        ratingDelta: battle.ratingDelta,
        userRating: battle.rating,
        opponentRating: battle.opponentRating,
        userWarrior: mapWarrior(findUserWarrior(battle, characterIds)),
        opponentWarrior: mapWarrior(
          battle.warriors.find(
            (warrior) => warrior.originalId === query.opponentId,
          ),
        ),
      }));
  },

  combatProfile(battles: Battles, characterIds: Set<string>): CombatProfile {
    const accumulator = combatProfileCalculator.createAccumulator();

    for (const battle of battles) {
      const userWarrior = findUserWarrior(battle, characterIds);

      if (!userWarrior) continue;
      accumulator.add({
        ...battle,
        userWarrior,
        opponents: battle.warriors.filter(
          (warrior) => warrior.team !== userWarrior.team,
        ),
      });
    }

    return accumulator.result();
  },
};
