import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";

export const BATTLE_RANKING_METRICS = [
  "damageDealt",
  "damageTaken",
  "effectiveness",
] as const;

export type BattleRankingMetric = (typeof BATTLE_RANKING_METRICS)[number];

export type BattlePlayerRankingEntry = {
  warrior: BattleWarrior;
  isFriendly: boolean;
  value: number;
  relative: number;
  share: number;
};

const METRIC_VALUE: Record<
  BattleRankingMetric,
  (warrior: BattleWarrior) => number
> = {
  damageDealt: (warrior) => warrior.damageDealt,
  damageTaken: (warrior) => warrior.damageTaken,
  effectiveness: (warrior) => warrior.damageDealtAfterDefensive,
};

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
