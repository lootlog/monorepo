import { createHash, randomBytes, randomUUID } from "node:crypto";

import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
} from "drizzle-orm";
import { Clock, Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  reservationShareInvitationTable,
  reservationShareTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  ResourceConflictError,
  ResourceGoneError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { getGuildIconUrl } from "#src/reservations/reservation-presentation";
import {
  ReservationSharingData,
  ReservationsRolesOperationError,
} from "./reservations-roles.handlers.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReservationSharingEvents {
  readonly sharingChanged: (
    sourceGuildId: string,
    audienceGuildIds: ReadonlyArray<string>,
  ) => Effect.Effect<void, unknown>;
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const orderGuildPair = (first: string, second: string) =>
  first < second ? ([first, second] as const) : ([second, first] as const);

export const makeReservationSharingDataLayer = (
  events: ReservationSharingEvents,
) =>
  Layer.effect(
    ReservationSharingData,
    Effect.map(ApiDatabase, (database) => {
      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError(
            (cause) => new ReservationsRolesOperationError({ cause }),
          ),
        );

      const findActiveShares = (guildId: string) =>
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
          .orderBy(desc(reservationShareTable.createdAt));

      const visibleGuildIds = (guildId: string) =>
        findActiveShares(guildId).pipe(
          Effect.map((shares) => [
            guildId,
            ...shares.map((share) =>
              share.firstGuildId === guildId
                ? share.secondGuildId
                : share.firstGuildId,
            ),
          ]),
        );

      const administrativeGuilds = (discordId: string) =>
        database
          .selectDistinct({
            id: guildTable.id,
            name: guildTable.name,
            icon: guildTable.icon,
          })
          .from(guildTable)
          .leftJoin(
            memberTable,
            and(
              eq(memberTable.guildId, guildTable.id),
              eq(memberTable.userId, discordId),
              eq(memberTable.active, true),
              isNotNull(memberTable.globalUserId),
            ),
          )
          .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
          .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
          .where(
            and(
              eq(guildTable.active, true),
              or(
                eq(guildTable.ownerId, discordId),
                arrayOverlaps(roleTable.permissions, [
                  Permission.OWNER,
                  Permission.ADMIN,
                ]),
              ),
            ),
          );

      const findUsableInvitation = (token: string) =>
        Effect.gen(function* () {
          const rows = yield* database
            .select({
              invitation: reservationShareInvitationTable,
              sourceGuild: guildTable,
            })
            .from(reservationShareInvitationTable)
            .innerJoin(
              guildTable,
              eq(guildTable.id, reservationShareInvitationTable.sourceGuildId),
            )
            .where(
              eq(reservationShareInvitationTable.tokenHash, hashToken(token)),
            )
            .limit(1);
          const row = rows[0];
          if (!row) {
            return yield* Effect.fail(
              new ResourceNotFoundError({ code: "INVITATION_NOT_FOUND" }),
            );
          }
          if (row.invitation.acceptedAt) {
            return yield* Effect.fail(
              new ResourceConflictError({ code: "INVITATION_ALREADY_USED" }),
            );
          }
          if (
            row.invitation.revokedAt ||
            row.invitation.expiresAt <= new Date(yield* Clock.currentTimeMillis)
          ) {
            return yield* Effect.fail(
              new ResourceGoneError({ code: "INVITATION_EXPIRED" }),
            );
          }
          return { ...row.invitation, sourceGuild: row.sourceGuild };
        });

      const publishSharingChanged = (
        sourceGuildId: string,
        audienceGuildIds: ReadonlyArray<string>,
      ) =>
        events
          .sharingChanged(sourceGuildId, audienceGuildIds)
          .pipe(Effect.ignore);

      return ReservationSharingData.of({
        listShares: (guildId) =>
          operation(
            Effect.gen(function* () {
              const now = new Date(yield* Clock.currentTimeMillis);
              const [shares, pendingInvitations] = yield* Effect.all([
                findActiveShares(guildId),
                database
                  .select()
                  .from(reservationShareInvitationTable)
                  .where(
                    and(
                      eq(
                        reservationShareInvitationTable.sourceGuildId,
                        guildId,
                      ),
                      isNull(reservationShareInvitationTable.acceptedAt),
                      isNull(reservationShareInvitationTable.revokedAt),
                      gt(reservationShareInvitationTable.expiresAt, now),
                    ),
                  )
                  .orderBy(desc(reservationShareInvitationTable.createdAt)),
              ]);
              const guildIds = [
                ...new Set(
                  shares.flatMap((share) => [
                    share.firstGuildId,
                    share.secondGuildId,
                  ]),
                ),
              ];
              const guilds =
                guildIds.length === 0
                  ? []
                  : yield* database
                      .select()
                      .from(guildTable)
                      .where(inArray(guildTable.id, guildIds));
              const guildById = new Map(
                guilds.map((guild) => [guild.id, guild]),
              );
              return {
                shares: shares.flatMap((share) => {
                  const partnerId =
                    share.firstGuildId === guildId
                      ? share.secondGuildId
                      : share.firstGuildId;
                  const partner = guildById.get(partnerId);
                  return partner
                    ? [
                        {
                          id: share.id,
                          partner: {
                            name: partner.name,
                            iconUrl: getGuildIconUrl(partner),
                          },
                          createdAt: share.createdAt,
                        },
                      ]
                    : [];
                }),
                pendingInvitations: pendingInvitations.map((invitation) => ({
                  id: invitation.id,
                  expiresAt: invitation.expiresAt,
                  createdAt: invitation.createdAt,
                })),
              };
            }).pipe(
              Effect.withSpan("listReservationShares.persistence", {
                attributes: { adapter: "ApiDatabase", retryCount: 0 },
              }),
            ),
          ),
        createInvitation: (guildId, userId) =>
          operation(
            Effect.gen(function* () {
              const token = randomBytes(32).toString("base64url");
              const expiresAt = new Date(
                (yield* Clock.currentTimeMillis) + INVITATION_TTL_MS,
              );
              const rows = yield* database
                .insert(reservationShareInvitationTable)
                .values({
                  id: randomUUID(),
                  sourceGuildId: guildId,
                  tokenHash: hashToken(token),
                  createdByUserId: userId,
                  expiresAt,
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .returning();
              const invitation = rows[0];
              if (!invitation) {
                return yield* Effect.fail(
                  new Error("Reservation invitation insert returned no row"),
                );
              }
              return {
                id: invitation.id,
                invitePath: `/reservation-sharing/invitations/${token}`,
                expiresAt: invitation.expiresAt,
                createdAt: invitation.createdAt,
              };
            }).pipe(
              Effect.withSpan("createReservationShareInvitation.transaction", {
                attributes: { adapter: "ApiDatabase", retryCount: 0 },
              }),
            ),
          ),
        revokeInvitation: (guildId, invitationId) =>
          operation(
            Effect.gen(function* () {
              const now = new Date(yield* Clock.currentTimeMillis);
              const rows = yield* database
                .update(reservationShareInvitationTable)
                .set({ revokedAt: now, updatedAt: now })
                .where(
                  and(
                    eq(reservationShareInvitationTable.id, invitationId),
                    eq(reservationShareInvitationTable.sourceGuildId, guildId),
                    isNull(reservationShareInvitationTable.acceptedAt),
                    isNull(reservationShareInvitationTable.revokedAt),
                  ),
                )
                .returning({ id: reservationShareInvitationTable.id });
              if (rows.length === 0) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({ code: "INVITATION_NOT_FOUND" }),
                );
              }
            }),
          ),
        revokeShare: (guildId, shareId) =>
          operation(
            Effect.gen(function* () {
              const shares = yield* database
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
                .limit(1);
              const share = shares[0];
              if (!share) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({
                    code: "RESERVATION_SHARE_NOT_FOUND",
                  }),
                );
              }
              const now = new Date(yield* Clock.currentTimeMillis);
              yield* database
                .update(reservationShareTable)
                .set({ revokedAt: now, updatedAt: now })
                .where(eq(reservationShareTable.id, share.id));
              yield* publishSharingChanged(guildId, [
                share.firstGuildId,
                share.secondGuildId,
              ]);
            }).pipe(
              Effect.withSpan("revokeReservationShare.transaction", {
                attributes: { adapter: "ApiDatabase", retryCount: 0 },
              }),
            ),
          ),
        previewInvitation: (token, discordId) =>
          operation(
            Effect.gen(function* () {
              const invitation = yield* findUsableInvitation(token);
              const [guilds, existingPartnerIds] = yield* Effect.all([
                administrativeGuilds(discordId),
                visibleGuildIds(invitation.sourceGuildId).pipe(
                  Effect.map((ids) => new Set(ids)),
                ),
              ]);
              return {
                sourceOrganization: {
                  name: invitation.sourceGuild.name,
                  iconUrl: getGuildIconUrl(invitation.sourceGuild),
                },
                expiresAt: invitation.expiresAt,
                eligibleTargetOrganizations: guilds
                  .filter((guild) => !existingPartnerIds.has(guild.id))
                  .map((guild) => ({
                    id: guild.id,
                    name: guild.name,
                    iconUrl: getGuildIconUrl(guild),
                  })),
              };
            }),
          ),
        acceptInvitation: (token, payload, { userId, discordId }) =>
          operation(
            Effect.gen(function* () {
              const invitation = yield* findUsableInvitation(token);
              const guilds = yield* administrativeGuilds(discordId);
              const targetGuild = guilds.find(
                (guild) => guild.id === payload.targetGuildId,
              );
              if (!targetGuild) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({
                    code: "TARGET_ORGANIZATION_NOT_FOUND",
                  }),
                );
              }
              if (targetGuild.id === invitation.sourceGuildId) {
                return yield* Effect.fail(
                  new ResourceConflictError({
                    code: "RESERVATION_SHARE_WITH_SELF",
                  }),
                );
              }
              const [firstGuildId, secondGuildId] = orderGuildPair(
                invitation.sourceGuildId,
                targetGuild.id,
              );
              const result = yield* database.transaction((transaction) =>
                Effect.gen(function* () {
                  const acceptedAt = new Date(yield* Clock.currentTimeMillis);
                  const claimed = yield* transaction
                    .update(reservationShareInvitationTable)
                    .set({
                      acceptedAt,
                      acceptedByUserId: userId,
                      targetGuildId: targetGuild.id,
                      updatedAt: acceptedAt,
                    })
                    .where(
                      and(
                        eq(reservationShareInvitationTable.id, invitation.id),
                        isNull(reservationShareInvitationTable.acceptedAt),
                        isNull(reservationShareInvitationTable.revokedAt),
                        gt(
                          reservationShareInvitationTable.expiresAt,
                          acceptedAt,
                        ),
                      ),
                    )
                    .returning({ id: reservationShareInvitationTable.id });
                  if (claimed.length === 0) return { kind: "expired" } as const;
                  const existing = yield* transaction
                    .select()
                    .from(reservationShareTable)
                    .where(
                      and(
                        eq(reservationShareTable.firstGuildId, firstGuildId),
                        eq(reservationShareTable.secondGuildId, secondGuildId),
                      ),
                    )
                    .limit(1);
                  if (existing[0] && !existing[0].revokedAt) {
                    return { kind: "exists" } as const;
                  }
                  const now = new Date(yield* Clock.currentTimeMillis);
                  const rows = yield* transaction
                    .insert(reservationShareTable)
                    .values({
                      id: existing[0]?.id ?? randomUUID(),
                      firstGuildId,
                      secondGuildId,
                      createdByUserId: invitation.createdByUserId,
                      acceptedByUserId: userId,
                      updatedAt: now,
                    })
                    .onConflictDoUpdate({
                      target: [
                        reservationShareTable.firstGuildId,
                        reservationShareTable.secondGuildId,
                      ],
                      set: {
                        createdByUserId: invitation.createdByUserId,
                        acceptedByUserId: userId,
                        revokedAt: null,
                        updatedAt: now,
                      },
                    })
                    .returning();
                  return rows[0]
                    ? ({ kind: "accepted", share: rows[0] } as const)
                    : ({ kind: "insert-failed" } as const);
                }),
              );
              if (result.kind === "expired") {
                return yield* Effect.fail(
                  new ResourceGoneError({ code: "INVITATION_EXPIRED" }),
                );
              }
              if (result.kind === "exists") {
                return yield* Effect.fail(
                  new ResourceConflictError({
                    code: "RESERVATION_SHARE_EXISTS",
                  }),
                );
              }
              if (result.kind === "insert-failed") {
                return yield* Effect.fail(
                  new Error("Reservation share insert returned no row"),
                );
              }
              yield* publishSharingChanged(invitation.sourceGuildId, [
                invitation.sourceGuildId,
                targetGuild.id,
              ]);
              return {
                id: result.share.id,
                partner: {
                  name: invitation.sourceGuild.name,
                  iconUrl: getGuildIconUrl(invitation.sourceGuild),
                },
                createdAt: result.share.createdAt,
              };
            }).pipe(
              Effect.withSpan("acceptReservationShareInvitation.transaction", {
                attributes: { adapter: "ApiDatabase", retryCount: 0 },
              }),
            ),
          ),
      });
    }),
  );
