import type { BattleWarrior } from "src/shared/modules/drizzle/schema";
import {
  BATTLE_WARRIOR_STATS_KEYS,
  type BattleWarriorStats,
  type BattleWarriorStatsKey,
} from "./battle-warrior-stats.types";

const BOOLEAN_STATS_KEYS = new Set<BattleWarriorStatsKey>([
  "isDead",
  "surrendered",
  "fled",
]);

type BattleWarriorStatsSource = Partial<Record<BattleWarriorStatsKey, unknown>>;

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

function normalizeStatValue(
  key: BattleWarriorStatsKey,
  value: unknown,
  fallback: BattleWarriorStats[BattleWarriorStatsKey],
): unknown {
  if (key === "spellsUsedMap") {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, number>)
      : fallback;
  }

  if (BOOLEAN_STATS_KEYS.has(key)) {
    return typeof value === "boolean" ? value : fallback;
  }

  return typeof value === "number" ? value : fallback;
}

export function buildBattleWarriorStats(
  source: BattleWarriorStatsSource,
): BattleWarriorStats {
  return BATTLE_WARRIOR_STATS_KEYS.reduce<
    Partial<Record<BattleWarriorStatsKey, unknown>>
  >((stats, key) => {
    const fallback = getDefaultStatValue(
      key,
    ) as BattleWarriorStats[BattleWarriorStatsKey];
    stats[key] = normalizeStatValue(key, source[key], fallback);
    return stats;
  }, {}) as BattleWarriorStats;
}

function mergeBattleWarriorStats(
  legacyStats: BattleWarriorStats,
  storedStats: unknown,
): BattleWarriorStats {
  if (!storedStats || typeof storedStats !== "object") {
    return legacyStats;
  }

  const storedStatsRecord = storedStats as Partial<BattleWarriorStats>;

  return BATTLE_WARRIOR_STATS_KEYS.reduce<
    Partial<Record<BattleWarriorStatsKey, unknown>>
  >((stats, key) => {
    stats[key] = normalizeStatValue(
      key,
      storedStatsRecord[key],
      legacyStats[key],
    );
    return stats;
  }, {}) as BattleWarriorStats;
}

export function inflateBattleWarrior(
  warrior: BattleWarrior,
): InflatedBattleWarrior {
  const {
    stats: storedStats,
    statsVersion: _statsVersion,
    ...warriorWithoutStorageFields
  } = warrior;
  const legacyStats = buildBattleWarriorStats(
    warriorWithoutStorageFields as BattleWarriorStatsSource,
  );

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
  } as TBattle & { warriors: InflatedBattleWarrior[] };
}

export function inflateBattleWarriorsInBattles<
  TBattle extends { warriors: BattleWarrior[] },
>(battles: TBattle[]): Array<TBattle & { warriors: InflatedBattleWarrior[] }> {
  return battles.map(inflateBattleWarriorsInBattle);
}
