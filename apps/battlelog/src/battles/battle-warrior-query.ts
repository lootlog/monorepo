import { and, asc, desc, eq, exists, sql, type SQL } from "drizzle-orm";
import { battleWarriors, battles } from "#src/database/schema";

export const selectedWarriorOrder = (battlesRef: typeof battles) => [
  desc(eq(battleWarriors.originalId, battlesRef.characterId)),
  asc(battleWarriors.originalId),
  asc(battleWarriors.id),
];

export const warriorExists = (
  battlesRef: typeof battles,
  ...conditions: (SQL | undefined)[]
) =>
  // Keep the indexed battle lookup correlated; flattening EXISTS can scan the
  // entire warrior table for an absent name instead of just the visible battles.
  exists(sql`(
    SELECT 1 FROM ${battleWarriors}
    WHERE ${and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)}
    OFFSET 0
  )`);
