import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";

export const BATTLE_RANKING_METRICS = ["damageDealt", "damageTaken"] as const;

export type BattleRankingMetric = (typeof BATTLE_RANKING_METRICS)[number];

export type BattlePlayerRankingEntry = {
  warrior: BattleWarrior;
  isFriendly: boolean;
  value: number;
  /** Relative to the top player, 0-1; drives the bar length. */
  relative: number;
  /** Share of all players' combined value, 0-1. */
  share: number;
};

const METRIC_VALUE: Record<
  BattleRankingMetric,
  (warrior: BattleWarrior) => number
> = {
  damageDealt: (warrior) => warrior.damageDealt,
  damageTaken: (warrior) => warrior.damageTaken,
};

/** Every warrior of the battle, highest value first. */
export const getBattlePlayerRanking = (
  battle: Battle,
  metric: BattleRankingMetric,
): BattlePlayerRankingEntry[] => {
  const friendlyTeam = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  )?.team;

  const values = battle.warriors.map((warrior) => ({
    warrior,
    value: METRIC_VALUE[metric](warrior),
  }));

  const total = values.reduce((sum, entry) => sum + entry.value, 0);
  const highest = Math.max(0, ...values.map((entry) => entry.value));

  return [...values]
    .sort((a, b) => b.value - a.value)
    .map((entry) => ({
      ...entry,
      isFriendly: entry.warrior.team === friendlyTeam,
      relative: highest === 0 ? 0 : entry.value / highest,
      share: total === 0 ? 0 : entry.value / total,
    }));
};
