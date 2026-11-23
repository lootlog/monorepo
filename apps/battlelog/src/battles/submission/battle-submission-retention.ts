import { inArray, lt, sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { firstBattleIdAt } from "#src/battles/battle-id";
import type { DrizzleDatabase } from "#src/database/database";
import { battleSubmissions } from "#src/database/schema";

export const BATTLE_SUBMISSION_RETENTION_DAYS = 30;

const PRUNE_BATCH_SIZE = 5_000;

export const pruneBattleSubmissions = Effect.fn("BattleSubmissions.prune")(
  function* (database: Pick<DrizzleDatabase, "select" | "delete">) {
    const now = yield* Clock.currentTimeMillis;

    const cutoff = firstBattleIdAt(
      new Date(now - BATTLE_SUBMISSION_RETENTION_DAYS * 86_400_000),
    );

    let removed = PRUNE_BATCH_SIZE;

    while (removed === PRUNE_BATCH_SIZE) {
      const expired = database
        .select({ ctid: sql<string>`ctid`.as("ctid") })
        .from(battleSubmissions)
        .where(lt(battleSubmissions.battleId, cutoff))
        .limit(PRUNE_BATCH_SIZE)
        .for("update", { skipLocked: true });

      const rows = yield* database
        .delete(battleSubmissions)
        .where(inArray(sql`ctid`, expired))
        .returning({ battleId: battleSubmissions.battleId });

      removed = rows.length;
    }
  },
);
