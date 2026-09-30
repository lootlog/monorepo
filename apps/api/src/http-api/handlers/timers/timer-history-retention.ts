import { and, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { timerHistoryEntryTable } from "#src/database/drizzle/schema";

export const pruneTimerHistory = Effect.fnUntraced(function* (
  transaction: Pick<typeof ApiDatabase.Service, "select" | "delete">,
  guildId: string,
  world: string,
  timerKey: string,
) {
  const staleHistory = yield* transaction
    .select({ id: timerHistoryEntryTable.id })
    .from(timerHistoryEntryTable)
    .where(
      and(
        eq(timerHistoryEntryTable.guildId, guildId),
        eq(timerHistoryEntryTable.world, world),
        eq(timerHistoryEntryTable.timerKey, timerKey),
      ),
    )
    .orderBy(desc(timerHistoryEntryTable.id))
    .offset(5);

  if (staleHistory.length > 0) {
    yield* transaction.delete(timerHistoryEntryTable).where(
      inArray(
        timerHistoryEntryTable.id,
        staleHistory.map(({ id }) => id),
      ),
    );
  }
});
