import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { Capability } from "@lootlog/schema/permissions";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { reservationTable } from "#src/database/drizzle/reservation.schema";

export type Reservation = typeof reservationTable.$inferSelect;

export type ReservationWithGuild = Reservation & {
  guild: typeof guildTable.$inferSelect;
};

const guildIdsGranting = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permission: Capability,
) =>
  selectAccessibleGuilds(database, discordId, [permission]).pipe(
    Effect.map((rows) => rows.map(({ guild }) => guild.id)),
  );

export const writableReservationGuildIds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
) =>
  Effect.map(
    Effect.all(
      [
        guildIdsGranting(
          database,
          discordId,
          Capability.LOOTLOG_RESERVATIONS_READ,
        ),
        guildIdsGranting(
          database,
          discordId,
          Capability.LOOTLOG_RESERVATIONS_WRITE,
        ),
      ],
      { concurrency: 2 },
    ),
    ([readable, writable]) => {
      const writableIds = new Set(writable);

      return readable.filter((guildId) => writableIds.has(guildId));
    },
  );

const findReservationWithGuild = (
  database: typeof ApiDatabase.Service,
  conditions: readonly [SQL, ...ReadonlyArray<SQL | undefined>],
) =>
  database
    .select({ reservation: reservationTable, guild: guildTable })
    .from(reservationTable)
    .innerJoin(guildTable, eq(guildTable.id, reservationTable.guildId))
    .where(and(...conditions))
    .limit(1)
    .pipe(
      Effect.map((rows) => {
        const row = rows[0];

        return row ? { ...row.reservation, guild: row.guild } : null;
      }),
    );

export const findOwnedReservation = (
  database: typeof ApiDatabase.Service,
  options: {
    readonly reservationId: number;
    readonly guildIds: string[];
    readonly userId: string;
    readonly discordId: string;
  },
) =>
  options.guildIds.length === 0
    ? Effect.succeed(null)
    : findReservationWithGuild(database, [
        eq(reservationTable.id, options.reservationId),
        inArray(reservationTable.guildId, options.guildIds),
        or(
          eq(reservationTable.createdByUserId, options.userId),
          eq(reservationTable.legacyCreatedByDiscordId, options.discordId),
        ),
      ]);
