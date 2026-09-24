import { sql } from "drizzle-orm";
import { battleWarriors } from "#src/database/schema";
import type {
  BattleWarriorStats,
  BattleWarriorStatsKey,
} from "./battle-warrior-stats.types.js";

type NumericStatKey = {
  [Key in BattleWarriorStatsKey]: BattleWarriorStats[Key] extends number
    ? Key
    : never;
}[BattleWarriorStatsKey];

// JSONB numbers take precedence per metric; malformed or absent packed values
// retain the legacy column, matching battle-warrior-stats inflation.
export const battleWarriorNumberStat = (key: NumericStatKey) =>
  sql<number>`case when jsonb_typeof(${battleWarriors.stats}->${key}) = 'number' then (${battleWarriors.stats}->>${key})::double precision else ${battleWarriors[key]} end`
    .mapWith(Number)
    .as(key);
