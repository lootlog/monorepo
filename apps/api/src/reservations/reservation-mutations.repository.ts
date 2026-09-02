import { Injectable } from "@nestjs/common";
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildTable,
  memberTable,
  reservationTable,
} from "#src/database/drizzle/schema";

export type PersistedReservation = typeof reservationTable.$inferSelect;

type ReservationRange = { startsAt: Date; endsAt: Date };

@Injectable()
export class ReservationMutationsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findGuild(guildId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(guildTable)
          .where(eq(guildTable.id, guildId))
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  async findActiveMember(options: {
    guildId: string;
    userId: string;
    discordId: string;
  }) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(memberTable)
          .where(
            and(
              eq(memberTable.guildId, options.guildId),
              eq(memberTable.active, true),
              or(
                eq(memberTable.globalUserId, options.userId),
                eq(memberTable.userId, options.discordId),
              ),
            ),
          )
          .orderBy(desc(memberTable.updatedAt))
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  createWithGuards(options: {
    guildId: string;
    spotId: string;
    spotName: string;
    range: ReservationRange;
    userId: string;
    discordId: string;
    authorDisplayName: string;
    authorAvatarUrl: string | null;
    reminderMinutesBefore: number | null;
    comment: string | null;
    activeLimit: number;
  }) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction.execute(
              sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`,
            );
            const overlap = yield* transaction
              .select({ id: reservationTable.id })
              .from(reservationTable)
              .where(
                and(
                  eq(reservationTable.guildId, options.guildId),
                  eq(reservationTable.spotId, options.spotId),
                  lt(reservationTable.startsAt, options.range.endsAt),
                  gt(reservationTable.endsAt, options.range.startsAt),
                ),
              )
              .limit(1);
            if (overlap.length > 0) return { kind: "overlap" } as const;

            const active = yield* transaction
              .select({ count: count() })
              .from(reservationTable)
              .where(
                and(
                  eq(reservationTable.guildId, options.guildId),
                  eq(reservationTable.spotId, options.spotId),
                  gt(reservationTable.endsAt, new Date()),
                  or(
                    eq(reservationTable.createdByUserId, options.userId),
                    eq(
                      reservationTable.legacyCreatedByDiscordId,
                      options.discordId,
                    ),
                  ),
                ),
              );
            if ((active[0]?.count ?? 0) >= options.activeLimit) {
              return { kind: "active-limit" } as const;
            }

            const now = new Date();
            const rows = yield* transaction
              .insert(reservationTable)
              .values({
                guildId: options.guildId,
                spotId: options.spotId,
                spotName: options.spotName,
                startsAt: options.range.startsAt,
                endsAt: options.range.endsAt,
                createdByUserId: options.userId,
                authorDisplayName: options.authorDisplayName,
                authorAvatarUrl: options.authorAvatarUrl,
                reminderMinutesBefore: options.reminderMinutesBefore,
                comment: options.comment,
                updatedAt: now,
              })
              .returning();
            const reservation = rows[0];
            if (!reservation) return { kind: "insert-failed" } as const;
            return { kind: "created", reservation } as const;
          }),
        ),
      ),
    );
  }

  findOwned(options: {
    reservationId: number;
    guildIds: ReadonlyArray<string>;
    userId: string;
    discordId: string;
  }) {
    return this.findOneWithGuild(
      and(
        eq(reservationTable.id, options.reservationId),
        inArray(reservationTable.guildId, [...options.guildIds]),
        or(
          eq(reservationTable.createdByUserId, options.userId),
          eq(reservationTable.legacyCreatedByDiscordId, options.discordId),
        ),
      ),
    );
  }

  findVisible(reservationId: number, guildIds: ReadonlyArray<string>) {
    return this.findOne(
      and(
        eq(reservationTable.id, reservationId),
        inArray(reservationTable.guildId, [...guildIds]),
      ),
    );
  }

  updateWithOverlapGuard(
    reservation: PersistedReservation,
    data: ReservationRange & {
      comment: string | null;
      reminderMinutesBefore: number | null;
      checkOverlap: boolean;
    },
  ) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction.execute(
              sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`,
            );
            if (data.checkOverlap) {
              const overlap = yield* transaction
                .select({ id: reservationTable.id })
                .from(reservationTable)
                .where(
                  and(
                    ne(reservationTable.id, reservation.id),
                    eq(reservationTable.guildId, reservation.guildId),
                    eq(reservationTable.spotId, reservation.spotId),
                    lt(reservationTable.startsAt, data.endsAt),
                    gt(reservationTable.endsAt, data.startsAt),
                  ),
                )
                .limit(1);
              if (overlap.length > 0) return { kind: "overlap" } as const;
            }
            const rows = yield* transaction
              .update(reservationTable)
              .set({
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                comment: data.comment,
                reminderMinutesBefore: data.reminderMinutesBefore,
                updatedAt: new Date(),
              })
              .where(eq(reservationTable.id, reservation.id))
              .returning();
            return {
              kind: "updated",
              reservation: rows[0] ?? reservation,
            } as const;
          }),
        ),
      ),
    );
  }

  async restore(reservation: PersistedReservation) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(reservationTable)
          .set({
            startsAt: reservation.startsAt,
            endsAt: reservation.endsAt,
            comment: reservation.comment,
            reminderMinutesBefore: reservation.reminderMinutesBefore,
            updatedAt: new Date(),
          })
          .where(eq(reservationTable.id, reservation.id)),
      ),
    );
  }

  async delete(reservationId: number) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(reservationTable)
          .where(eq(reservationTable.id, reservationId)),
      ),
    );
  }

  private async findOne(where: Exclude<ReturnType<typeof and>, undefined>) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.select().from(reservationTable).where(where).limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  private async findOneWithGuild(
    where: Exclude<ReturnType<typeof and>, undefined>,
  ) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ reservation: reservationTable, guild: guildTable })
          .from(reservationTable)
          .innerJoin(guildTable, eq(guildTable.id, reservationTable.guildId))
          .where(where)
          .limit(1)
          .pipe(
            Effect.map((items) =>
              items.map(({ reservation, guild }) => ({
                ...reservation,
                guild,
              })),
            ),
          ),
      ),
    );
    return rows[0] ?? null;
  }
}
