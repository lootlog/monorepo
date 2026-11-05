import { Clock, Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { and, eq, exists, sql } from "drizzle-orm";
import {
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/timer.schema";
import { TIMER_TYPES } from "./timer-limits.js";

export const makeTimersCleanup = (
  database: ApiDatabaseValue,
  options: { readonly enabled: boolean; readonly retentionDays: number },
) => {
  return Effect.gen(function* () {
    if (!options.enabled) return;
    const cutoff = new Date(yield* Clock.currentTimeMillis);
    cutoff.setDate(cutoff.getDate() - options.retentionDays);

    const expiredManual = and(
      sql`${timerTable.maxSpawnTime} < ${cutoff}`,
      sql`(${timerTable.npc}->>'margonemType')::int = ${TIMER_TYPES.CUSTOM_MANUAL}`,
    );

    // Manual timers end with their window: the timer, deleted or not, and
    // the history that could restore it are removed together.
    const deleted = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        yield* transaction.delete(timerHistoryEntryTable).where(
          exists(
            transaction
              .select({ timerKey: timerTable.timerKey })
              .from(timerTable)
              .where(
                and(
                  eq(timerTable.guildId, timerHistoryEntryTable.guildId),
                  eq(timerTable.world, timerHistoryEntryTable.world),
                  eq(timerTable.timerKey, timerHistoryEntryTable.timerKey),
                  expiredManual,
                ),
              ),
          ),
        );

        return yield* transaction
          .delete(timerTable)
          .where(expiredManual)
          .returning({ timerKey: timerTable.timerKey });
      }),
    );

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
