import { Clock, Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import { lt } from "drizzle-orm";
import { reservationTable } from "#src/database/drizzle/schema";

export const makeReservationsCleanup = (
  database: ApiDatabaseValue,
  options: { readonly enabled: boolean; readonly retentionDays: number },
) => {
  return Effect.gen(function* () {
    if (!options.enabled) return;
    const cutoff = new Date(yield* Clock.currentTimeMillis);
    cutoff.setDate(cutoff.getDate() - options.retentionDays);
    const deleted = yield* database
      .delete(reservationTable)
      .where(lt(reservationTable.endsAt, cutoff))
      .returning({ id: reservationTable.id });
    yield* Effect.logInfo("Expired reservations deleted").pipe(
      Effect.annotateLogs({ deleted: deleted.length, cutoff }),
    );
  }).pipe(
    Effect.withSpan("reservations.cleanup", {
      attributes: { adapter: "drizzle", retryCount: 0 },
    }),
    Effect.catch((error) =>
      Effect.logError("Reservation cleanup failed").pipe(
        Effect.annotateLogs({ cause: error }),
      ),
    ),
  );
};
