import { and, eq, exists, type SQL } from "drizzle-orm";
import type { DrizzleDatabase } from "#src/database/database";
import { battleWarriors, battles } from "#src/database/schema";

export const makeWarriorExists =
  (drizzle: DrizzleDatabase) =>
  (battlesRef: typeof battles, ...conditions: (SQL | undefined)[]) =>
    exists(
      drizzle
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );
