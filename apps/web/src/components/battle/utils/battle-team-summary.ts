import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";
import { getBattleTeamPresentation } from "./battle-team-presentation";

export const BATTLE_SUMMARY_METRICS = [
  "damageDealt",
  "damageTaken",
  "healing",
  "criticalHits",
  "avoidedAttacks",
  "turns",
] as const;

export type BattleSummaryMetric = (typeof BATTLE_SUMMARY_METRICS)[number];

/**
 * Damage types that add up to the dealt damage. Rage, third attack, stigma and reflected
 * damage are left out: they overlap these types or are not part of the dealt total.
 */
export const BATTLE_DAMAGE_SEGMENTS = [
  "meleeDamage",
  "distanceDamage",
  "auxiliaryDamage",
  "fireDamage",
  "frostDamage",
  "lightningDamage",
  "trueDamageDealt",
] as const;

export type BattleDamageSegment = (typeof BATTLE_DAMAGE_SEGMENTS)[number];

export type BattleSegmentValue<TKey extends string> = {
  key: TKey;
  value: number;
  /** Share of the side's segment total, 0-1. */
  share: number;
};

export type BattleTeamSummary = {
  metrics: Record<BattleSummaryMetric, number>;
  damageSegments: BattleSegmentValue<BattleDamageSegment>[];
};

const METRIC_VALUE: Record<
  BattleSummaryMetric,
  (warrior: BattleWarrior) => number
> = {
  damageDealt: (warrior) => warrior.damageDealt,
  damageTaken: (warrior) => warrior.damageTaken,
  healing: (warrior) => warrior.activeHealing + warrior.passiveHealing,
  criticalHits: (warrior) => warrior.criticalHits,
  avoidedAttacks: (warrior) => warrior.evasions + warrior.blocks,
  turns: (warrior) => warrior.turns,
};

const sumBy = (
  team: BattleWarrior[],
  getValue: (warrior: BattleWarrior) => number,
) => team.reduce((total, warrior) => total + getValue(warrior), 0);

const getSegments = <TKey extends keyof BattleWarrior & string>(
  team: BattleWarrior[],
  keys: readonly TKey[],
  getValue: (warrior: BattleWarrior, key: TKey) => number,
): BattleSegmentValue<TKey>[] => {
  const values = keys.map((key) => ({
    key,
    value: sumBy(team, (warrior) => getValue(warrior, key)),
  }));

  const total = values.reduce((sum, segment) => sum + segment.value, 0);

  return values.flatMap((segment) =>
    segment.value > 0 ? [{ ...segment, share: segment.value / total }] : [],
  );
};

const getTeamSummary = (team: BattleWarrior[]): BattleTeamSummary => ({
  metrics: {
    damageDealt: sumBy(team, METRIC_VALUE.damageDealt),
    damageTaken: sumBy(team, METRIC_VALUE.damageTaken),
    healing: sumBy(team, METRIC_VALUE.healing),
    criticalHits: sumBy(team, METRIC_VALUE.criticalHits),
    avoidedAttacks: sumBy(team, METRIC_VALUE.avoidedAttacks),
    turns: sumBy(team, METRIC_VALUE.turns),
  },
  damageSegments: getSegments(
    team,
    BATTLE_DAMAGE_SEGMENTS,
    (warrior, key) => warrior[key],
  ),
});

/** Team totals with the viewing character's team first, matching the overview card. */
export const getBattleTeamSummaries = (battle: Battle) => {
  const { leftTeam, rightTeam } = getBattleTeamPresentation(battle);

  return {
    friendly: getTeamSummary(leftTeam),
    enemy: getTeamSummary(rightTeam),
  };
};
