import { Option, Schema } from "effect";
import type { BattleWarrior } from "#src/database/schema";
import {
  BATTLE_WARRIOR_STATS_KEYS,
  type BattleWarriorStats,
  type BattleWarriorStatsKey,
} from "./battle-warrior-stats.types.js";

const BOOLEAN_STATS_KEYS = new Set<BattleWarriorStatsKey>([
  "isDead",
  "surrendered",
  "fled",
]);

type BattleWarriorStatsSource = Partial<
  Pick<BattleWarrior, BattleWarriorStatsKey>
>;

export type InflatedBattleWarrior = Omit<
  BattleWarrior,
  "stats" | "statsVersion"
> &
  BattleWarriorStats;

const decodeSpells = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Number),
);

const isBoolean = Schema.is(Schema.Boolean);

const isNumber = Schema.is(Schema.Number);

const isStatsRecord = Schema.is(Schema.Record(Schema.String, Schema.Unknown));

export const resolveBattleWarriorSpells = (
  stored: BattleWarrior["spellsUsedMap"],
  legacy: BattleWarrior["spellsUsedMap"],
) =>
  Option.getOrElse(decodeSpells(stored), () =>
    Option.getOrElse(decodeSpells(legacy), () => ({})),
  );

function normalizeBattleWarriorStats(
  source: BattleWarriorStatsSource,
  fallback: BattleWarriorStatsSource = {},
): BattleWarriorStats {
  const entries = BATTLE_WARRIOR_STATS_KEYS.map((key) => {
    const value = source[key];

    if (key === "spellsUsedMap")
      return [key, resolveBattleWarriorSpells(value, fallback[key])];

    if (BOOLEAN_STATS_KEYS.has(key)) {
      if (isBoolean(value)) return [key, value];

      const fallbackValue = fallback[key];

      return [key, isBoolean(fallbackValue) ? fallbackValue : false];
    }

    if (isNumber(value)) return [key, value];

    const fallbackValue = fallback[key];

    return [key, isNumber(fallbackValue) ? fallbackValue : 0];
  });

  // SAFETY: Every stats key is enumerated once and its schema validates the stored value, legacy fallback, or default. Object.fromEntries loses that key/value correlation.
  return Object.fromEntries(entries) as BattleWarriorStats;
}

export function buildBattleWarriorStats(
  source: BattleWarriorStatsSource,
): BattleWarriorStats {
  return normalizeBattleWarriorStats(source);
}

export function inflateBattleWarrior(
  warrior: BattleWarrior,
): InflatedBattleWarrior {
  const {
    stats: storedStats,
    statsVersion: _statsVersion,
    ...warriorWithoutStorageFields
  } = warrior;

  return {
    ...warriorWithoutStorageFields,
    ...normalizeBattleWarriorStats(
      isStatsRecord(storedStats) ? storedStats : {},
      warriorWithoutStorageFields,
    ),
  };
}

export function inflateBattleWarriorsInBattle<
  TBattle extends { warriors: BattleWarrior[] },
>(battle: TBattle): TBattle & { warriors: InflatedBattleWarrior[] } {
  return {
    ...battle,
    warriors: battle.warriors.map(inflateBattleWarrior),
  };
}

export function inflateBattleWarriorsInBattles<
  TBattle extends { warriors: BattleWarrior[] },
>(battles: TBattle[]): Array<TBattle & { warriors: InflatedBattleWarrior[] }> {
  return battles.map(inflateBattleWarriorsInBattle);
}
