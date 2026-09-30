import type {
  BattleDurationStats,
  BattleStreak,
} from "#src/battles/analytics/battle-statistics-response";

export const battleSummaryCalculator = {
  getEmptyStreak(): BattleStreak {
    return {
      current: { type: "none", count: 0 },
      longest: { wins: 0, losses: 0 },
    };
  },

  getEmptyDurationStats(): BattleDurationStats {
    return {
      avgWinDuration: 0,
      avgLossDuration: 0,
      fastest: null,
      longest: null,
    };
  },
};
