import { Clock, Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { and, sql } from "drizzle-orm";
import { timerTable } from "#src/database/drizzle/schema";
import { TIMER_TYPES } from "./timer-limits.js";

export const makeTimersCleanup = (
  database: ApiDatabaseValue,
  options: { readonly enabled: boolean; readonly retentionDays: number },
) => {
  return Effect.gen(function* () {
    if (!options.enabled) return;
    const cutoff = new Date(yield* Clock.currentTimeMillis);
    cutoff.setDate(cutoff.getDate() - options.retentionDays);
    const deleted = yield* database
      .delete(timerTable)
      .where(
        and(
          sql`${timerTable.maxSpawnTime} < ${cutoff}`,
          sql`(${timerTable.npc}->>'margonemType')::int = ${TIMER_TYPES.CUSTOM_MANUAL}`,
        ),
      )
      .returning({ timerKey: timerTable.timerKey });
    yield* Effect.logInfo("Expired manual timers deleted").pipe(
      Effect.annotateLogs({ deleted: deleted.length, cutoff }),
    );
  }).pipe(
    Effect.withSpan("timers.cleanup", {
      attributes: { adapter: "drizzle", retryCount: 0 },
    }),
    Effect.catch((error) =>
      Effect.logError("Timer cleanup failed").pipe(
        Effect.annotateLogs({ cause: error }),
      ),
    ),
  );
};
