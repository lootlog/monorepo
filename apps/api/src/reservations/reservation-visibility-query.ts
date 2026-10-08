import { and, eq, isNull, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { reservationShareTable } from "#src/database/drizzle/schema";

export const selectActiveReservationShares = (
  database: typeof ApiDatabase.Service,
  guildId: string,
) =>
  database
    .select()
    .from(reservationShareTable)
    .where(
      and(
        isNull(reservationShareTable.revokedAt),
        or(
          eq(reservationShareTable.firstGuildId, guildId),
          eq(reservationShareTable.secondGuildId, guildId),
        ),
      ),
    );

export const visibleReservationGuildIds = (
  database: typeof ApiDatabase.Service,
  guildId: string,
) =>
  selectActiveReservationShares(database, guildId).pipe(
    Effect.map((shares) => [
      guildId,
      ...shares.map((share) =>
        share.firstGuildId === guildId
          ? share.secondGuildId
          : share.firstGuildId,
      ),
    ]),
  );
