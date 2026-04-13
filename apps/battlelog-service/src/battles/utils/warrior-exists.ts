import { and, eq, exists, type SQL } from "drizzle-orm";
import type { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  battleWarriors,
  type battles,
} from "src/shared/modules/drizzle/schema";

export function warriorExists(
  drizzle: DrizzleService,
  battlesRef: typeof battles,
  ...conditions: (SQL | undefined)[]
) {
  return exists(
    drizzle.db
      .select({ one: eq(battleWarriors.id, battleWarriors.id) })
      .from(battleWarriors)
      .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
  );
}
