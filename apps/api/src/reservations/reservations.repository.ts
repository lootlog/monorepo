import { and, asc, desc, eq, gt, gte, inArray, lt, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildTable,
  reservationTable,
  userPinnedReservationSpotTable,
} from "#src/database/drizzle/schema";

export class ReservationsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findPinnedSpotIds(userId: string, guildId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ spotId: userPinnedReservationSpotTable.spotId })
          .from(userPinnedReservationSpotTable)
          .where(
            and(
              eq(userPinnedReservationSpotTable.userId, userId),
              eq(userPinnedReservationSpotTable.guildId, guildId),
            ),
          ),
      ),
    );
  }

  findUpcoming(guildIds: ReadonlyArray<string>, now: Date) {
    return this.findWithGuild(
      and(
        inArray(reservationTable.guildId, [...guildIds]),
        gt(reservationTable.endsAt, now),
      ),
      [asc(reservationTable.startsAt), asc(reservationTable.id)],
    );
  }

  findWindow(
    guildIds: ReadonlyArray<string>,
    spotId: string,
    from: Date,
    to: Date,
  ) {
    return this.findWithGuild(
      and(
        inArray(reservationTable.guildId, [...guildIds]),
        eq(reservationTable.spotId, spotId),
        lt(reservationTable.startsAt, to),
        gt(reservationTable.endsAt, from),
      ),
      [asc(reservationTable.startsAt), asc(reservationTable.id)],
    );
  }

  findMine(options: {
    guildIds: ReadonlyArray<string>;
    userId: string;
    discordId: string;
    status: "past" | "upcoming";
    now: Date;
    retentionStart: Date;
  }) {
    const timeCondition =
      options.status === "past"
        ? and(
            gte(reservationTable.endsAt, options.retentionStart),
            lt(reservationTable.endsAt, options.now),
          )
        : gte(reservationTable.endsAt, options.now);
    const order =
      options.status === "past"
        ? [desc(reservationTable.endsAt), desc(reservationTable.id)]
        : [asc(reservationTable.startsAt), asc(reservationTable.id)];
    return this.findWithGuild(
      and(
        inArray(reservationTable.guildId, [...options.guildIds]),
        timeCondition,
        or(
          eq(reservationTable.createdByUserId, options.userId),
          eq(reservationTable.legacyCreatedByDiscordId, options.discordId),
        ),
      ),
      order,
    );
  }

  async pinSpot(userId: string, guildId: string, spotId: string) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(userPinnedReservationSpotTable)
          .values({ userId, guildId, spotId })
          .onConflictDoNothing({
            target: [
              userPinnedReservationSpotTable.userId,
              userPinnedReservationSpotTable.guildId,
              userPinnedReservationSpotTable.spotId,
            ],
          }),
      ),
    );
  }

  async unpinSpot(userId: string, guildId: string, spotId: string) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(userPinnedReservationSpotTable)
          .where(
            and(
              eq(userPinnedReservationSpotTable.userId, userId),
              eq(userPinnedReservationSpotTable.guildId, guildId),
              eq(userPinnedReservationSpotTable.spotId, spotId),
            ),
          ),
      ),
    );
  }

  private findWithGuild(
    where: Exclude<ReturnType<typeof and>, undefined>,
    order: ReadonlyArray<ReturnType<typeof asc>>,
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ reservation: reservationTable, guild: guildTable })
          .from(reservationTable)
          .innerJoin(guildTable, eq(guildTable.id, reservationTable.guildId))
          .where(where)
          .orderBy(...order)
          .pipe(
            Effect.map((rows) =>
              rows.map(({ reservation, guild }) => ({ ...reservation, guild })),
            ),
          ),
      ),
    );
  }
}
