import { and, asc, desc, eq, exists, sql, type SQL } from "drizzle-orm";
import {
  battleWarriorFilters,
  battleWarriors,
  battles,
} from "#src/database/schema";

export const selectedWarriorOrder = (battlesRef: typeof battles) => [
  desc(eq(battleWarriors.originalId, battlesRef.characterId)),
  asc(battleWarriors.originalId),
];

/**
 * Whether a battle has a warrior matching `conditions`, which read
 * `battleWarriorFilters`.
 */
export const warriorExists = (
  battlesRef: typeof battles,
  ...conditions: (SQL | undefined)[]
) =>
  // The owner narrows each lookup to that owner's adjacent index entries.
  // OFFSET 0 keeps it correlated: flattened, a filter without one owner could
  // scan every owner's warriors instead of just the visible battles.
  exists(sql`(
    SELECT 1 FROM ${battleWarriorFilters}
    WHERE ${and(
      eq(battleWarriorFilters.userId, battlesRef.userId),
      eq(battleWarriorFilters.battleId, battlesRef.id),
      ...conditions,
    )}
    OFFSET 0
  )`);
