import { randomUUID } from "node:crypto";

import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  guildTable,
  reservationShareInvitationTable,
  reservationShareTable,
} from "#src/database/drizzle/schema";

export class ReservationSharingRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  findActiveShares(guildId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
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
          )
          .orderBy(desc(reservationShareTable.createdAt)),
      ),
    );
  }

  async listActiveSharesWithGuilds(guildId: string) {
    const shares = await this.findActiveShares(guildId);
    const guildIds = [
      ...new Set(
        shares.flatMap((share) => [share.firstGuildId, share.secondGuildId]),
      ),
    ];
    if (guildIds.length === 0) return [];
    const guilds = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(guildTable)
          .where(inArray(guildTable.id, guildIds)),
      ),
    );
    const byId = new Map(guilds.map((guild) => [guild.id, guild]));
    return shares.flatMap((share) => {
      const firstGuild = byId.get(share.firstGuildId);
      const secondGuild = byId.get(share.secondGuildId);
      return firstGuild && secondGuild
        ? [{ ...share, firstGuild, secondGuild }]
        : [];
    });
  }

  findPendingInvitations(sourceGuildId: string, now: Date) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(reservationShareInvitationTable)
          .where(
            and(
              eq(reservationShareInvitationTable.sourceGuildId, sourceGuildId),
              isNull(reservationShareInvitationTable.acceptedAt),
              isNull(reservationShareInvitationTable.revokedAt),
              gt(reservationShareInvitationTable.expiresAt, now),
            ),
          )
          .orderBy(desc(reservationShareInvitationTable.createdAt)),
      ),
    );
  }

  async createInvitation(options: {
    sourceGuildId: string;
    tokenHash: string;
    createdByUserId: string;
    expiresAt: Date;
  }) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(reservationShareInvitationTable)
          .values({ id: randomUUID(), ...options, updatedAt: new Date() })
          .returning(),
      ),
    );
    const invitation = rows[0];
    if (!invitation)
      throw new Error("Reservation invitation insert returned no row");
    return invitation;
  }

  async findInvitation(tokenHash: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            invitation: reservationShareInvitationTable,
            sourceGuild: guildTable,
          })
          .from(reservationShareInvitationTable)
          .innerJoin(
            guildTable,
            eq(guildTable.id, reservationShareInvitationTable.sourceGuildId),
          )
          .where(eq(reservationShareInvitationTable.tokenHash, tokenHash))
          .limit(1)
          .pipe(
            Effect.map((items) =>
              items.map(({ invitation, sourceGuild }) => ({
                ...invitation,
                sourceGuild,
              })),
            ),
          ),
      ),
    );
    return rows[0] ?? null;
  }

  acceptInvitation(options: {
    invitationId: string;
    sourceGuildId: string;
    targetGuildId: string;
    createdByUserId: string;
    acceptedByUserId: string;
    firstGuildId: string;
    secondGuildId: string;
  }) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const acceptedAt = new Date();
            const claimed = yield* transaction
              .update(reservationShareInvitationTable)
              .set({
                acceptedAt,
                acceptedByUserId: options.acceptedByUserId,
                targetGuildId: options.targetGuildId,
                updatedAt: acceptedAt,
              })
              .where(
                and(
                  eq(reservationShareInvitationTable.id, options.invitationId),
                  isNull(reservationShareInvitationTable.acceptedAt),
                  isNull(reservationShareInvitationTable.revokedAt),
                  gt(reservationShareInvitationTable.expiresAt, acceptedAt),
                ),
              )
              .returning({ id: reservationShareInvitationTable.id });
            if (claimed.length === 0) return { kind: "expired" } as const;

            const existing = yield* transaction
              .select()
              .from(reservationShareTable)
              .where(
                and(
                  eq(reservationShareTable.firstGuildId, options.firstGuildId),
                  eq(
                    reservationShareTable.secondGuildId,
                    options.secondGuildId,
                  ),
                ),
              )
              .limit(1);
            if (existing[0] && !existing[0].revokedAt)
              return { kind: "exists" } as const;

            const now = new Date();
            const rows = yield* transaction
              .insert(reservationShareTable)
              .values({
                id: existing[0]?.id ?? randomUUID(),
                firstGuildId: options.firstGuildId,
                secondGuildId: options.secondGuildId,
                createdByUserId: options.createdByUserId,
                acceptedByUserId: options.acceptedByUserId,
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: [
                  reservationShareTable.firstGuildId,
                  reservationShareTable.secondGuildId,
                ],
                set: {
                  createdByUserId: options.createdByUserId,
                  acceptedByUserId: options.acceptedByUserId,
                  revokedAt: null,
                  updatedAt: now,
                },
              })
              .returning();
            const share = rows[0];
            if (!share) return { kind: "insert-failed" } as const;
            return { kind: "accepted", share } as const;
          }),
        ),
      ),
    );
  }

  async revokeInvitation(sourceGuildId: string, invitationId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(reservationShareInvitationTable)
          .set({ revokedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(reservationShareInvitationTable.id, invitationId),
              eq(reservationShareInvitationTable.sourceGuildId, sourceGuildId),
              isNull(reservationShareInvitationTable.acceptedAt),
              isNull(reservationShareInvitationTable.revokedAt),
            ),
          )
          .returning({ id: reservationShareInvitationTable.id }),
      ),
    );
    return rows.length > 0;
  }

  async findActiveShare(guildId: string, shareId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(reservationShareTable)
          .where(
            and(
              eq(reservationShareTable.id, shareId),
              isNull(reservationShareTable.revokedAt),
              or(
                eq(reservationShareTable.firstGuildId, guildId),
                eq(reservationShareTable.secondGuildId, guildId),
              ),
            ),
          )
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  async revokeShare(shareId: string) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .update(reservationShareTable)
          .set({ revokedAt: new Date(), updatedAt: new Date() })
          .where(eq(reservationShareTable.id, shareId)),
      ),
    );
  }
}
