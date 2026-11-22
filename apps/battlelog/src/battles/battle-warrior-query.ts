import { and, asc, desc, eq, exists, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  battleWarriorFilters,
  battleWarriors,
  battles,
} from "#src/database/schema";

export const selectedWarriorOrder = (
  battlesRef: typeof battles,
  warriors: { originalId: AnyPgColumn } = battleWarriors,
) => [
  desc(eq(warriors.originalId, battlesRef.characterId)),
  asc(warriors.originalId),
];

export const warriorExists = (
  battlesRef: typeof battles,
  ...conditions: (SQL | undefined)[]
) =>
  exists(sql`(
    SELECT 1 FROM ${battleWarriorFilters}
    WHERE ${and(
      eq(battleWarriorFilters.userId, battlesRef.userId),
      eq(battleWarriorFilters.battleId, battlesRef.id),
      ...conditions,
    )}
    OFFSET 0
  )`);
