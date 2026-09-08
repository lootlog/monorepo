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
type BattleWarriorStatsFallback = (
  key: BattleWarriorStatsKey,
) => BattleWarriorStats[BattleWarriorStatsKey];

export type InflatedBattleWarrior = Omit<
  BattleWarrior,
  "stats" | "statsVersion"
> &
  BattleWarriorStats;

function getDefaultStatValue(key: BattleWarriorStatsKey) {
  if (key === "spellsUsedMap") {
    return {};
  }

  if (BOOLEAN_STATS_KEYS.has(key)) {
    return false;
  }

  return 0;
}

const decodeSpells = Schema.decodeUnknownOption(
  Schema.Record(Schema.String, Schema.Number),
);
const decodeBoolean = Schema.decodeUnknownOption(Schema.Boolean);
const decodeNumber = Schema.decodeUnknownOption(Schema.Number);

function normalizeBattleWarriorStats(
  source: BattleWarriorStatsSource,
  getFallback: BattleWarriorStatsFallback,
): BattleWarriorStats {
  const entries = BATTLE_WARRIOR_STATS_KEYS.map((key) => {
    const fallback = () => getFallback(key);
    if (key === "spellsUsedMap")
      return [key, Option.getOrElse(decodeSpells(source[key]), fallback)];
    if (BOOLEAN_STATS_KEYS.has(key))
      return [key, Option.getOrElse(decodeBoolean(source[key]), fallback)];
    return [key, Option.getOrElse(decodeNumber(source[key]), fallback)];
  });
  // SAFETY: Every key in the stats type is enumerated once; key-specific schemas validate values, and both private fallback callers supply the corresponding stat's default or legacy value. Object.fromEntries loses that key/value correlation.
  return Object.fromEntries(entries) as BattleWarriorStats;
}

export function buildBattleWarriorStats(
  source: BattleWarriorStatsSource,
): BattleWarriorStats {
  return normalizeBattleWarriorStats(source, getDefaultStatValue);
}

function mergeBattleWarriorStats(
  legacyStats: BattleWarriorStats,
  storedStats: BattleWarrior["stats"],
): BattleWarriorStats {
  if (!Schema.is(Schema.Record(Schema.String, Schema.Unknown))(storedStats)) {
    return legacyStats;
  }

  return normalizeBattleWarriorStats(storedStats, (key) => legacyStats[key]);
}

export function inflateBattleWarrior(
  warrior: BattleWarrior,
): InflatedBattleWarrior {
  const {
    stats: storedStats,
    statsVersion: _statsVersion,
    ...warriorWithoutStorageFields
  } = warrior;
  const legacyStats = buildBattleWarriorStats(warriorWithoutStorageFields);

  return {
    ...warriorWithoutStorageFields,
    ...mergeBattleWarriorStats(legacyStats, storedStats),
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
