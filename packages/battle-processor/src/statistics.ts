import {
  getLegendaryTotal,
  type LegendaryTotalWarrior,
  type Warrior,
} from "./warrior.js";

type StatisticEntry = {
  warriorId: string;
  name: string;
  value: number;
  formattedValue?: string;
};

export type BattleStatistics = {
  topDamageDealer: StatisticEntry | null;
  topTank: StatisticEntry | null;
  bestEfficiency: StatisticEntry | null;
  criticalMaster: StatisticEntry | null;
  evasionExpert: StatisticEntry | null;
  shieldWall: StatisticEntry | null;
  damagePerTurn: StatisticEntry | null;
  mostActive: StatisticEntry | null;
  legendaryWarrior: StatisticEntry | null;
  untouchable: StatisticEntry | null;
};

export type BattleStatisticsWarrior = Pick<
  Warrior,
  | "originalId"
  | "name"
  | "turns"
  | "damageDealt"
  | "damageDealtAfterDefensive"
  | "damageDealtAfterDefensivePercentage"
  | "damageTaken"
  | "criticalHits"
  | "evasions"
  | "blocks"
> &
  LegendaryTotalWarrior;

/**
 * Derives the battle awards from participant totals. A tie goes to the
 * warrior listed first, so pass warriors in the order the battle introduced
 * them.
 */
export function calculateBattleStatistics(
  warriors: readonly BattleStatisticsWarrior[],
): BattleStatistics {
  const activeWarriors = warriors.filter((w) => w.turns > 0);

  const findTop = (
    candidates: readonly BattleStatisticsWarrior[],
    getValue: (w: BattleStatisticsWarrior) => number,
    format?: (value: number) => string,
  ): StatisticEntry | null => {
    const [first, ...rest] = candidates;

    if (!first) return null;

    const top = rest.reduce(
      (best, current) => (getValue(current) > getValue(best) ? current : best),
      first,
    );

    const value = getValue(top);

    return value > 0
      ? {
          warriorId: top.originalId,
          name: top.name,
          value,
          formattedValue: format ? format(value) : undefined,
        }
      : null;
  };

  return {
    topDamageDealer: findTop(warriors, (w) => w.damageDealtAfterDefensive),
    topTank: findTop(warriors, (w) => w.damageTaken),
    bestEfficiency: findTop(
      warriors.filter((w) => w.damageDealt > 0),
      (w) => w.damageDealtAfterDefensivePercentage,
      (v) => `${v.toFixed(2)}%`,
    ),
    criticalMaster: findTop(warriors, (w) => w.criticalHits),
    evasionExpert: findTop(warriors, (w) => w.evasions),
    shieldWall: findTop(warriors, (w) => w.blocks),
    damagePerTurn: findTop(
      activeWarriors,
      (w) => (w.turns > 0 ? w.damageDealtAfterDefensive / w.turns : 0),
      (v) => v.toFixed(1),
    ),
    mostActive: findTop(warriors, (w) => w.turns),
    legendaryWarrior: findTop(warriors, getLegendaryTotal),
    untouchable: findTop(warriors, (w) => w.evasions + w.blocks),
  };
}
