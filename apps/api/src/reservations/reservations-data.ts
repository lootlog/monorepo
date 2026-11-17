import {
  type OrganizationWorkspaceIdentity,
  OrganizationWorkspaceOperationError,
} from "#src/guilds/organization-workspace-access";
import { readGuildOrderPreference } from "#src/guilds/guild-order-query";
import { sortGuildsByPreference } from "#src/guilds/guild-order";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { Clock, Context, Effect, Layer } from "effect";
import type { ReservationViewerContext } from "./reservation-viewer.js";
import { and, asc, desc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { reservationTable } from "#src/database/drizzle/reservation.schema";
import { presentReservation } from "./reservation-presentation.js";
import type { AcceptReservationShareInvitationRequest } from "#src/contracts/reservation-sharing/schemas";
import type {
  CreateReservationRequest,
  MyReservationsQuery,
  UpdateReservationRequest,
} from "#src/contracts/reservations/schemas";

type DataEffect = Effect.Effect<unknown, OrganizationWorkspaceOperationError>;

export class OrganizationWorkspaceData extends Context.Service<
  OrganizationWorkspaceData,
  {
    readonly create: (
      context: ReservationViewerContext,
      spotId: string,
      payload: CreateReservationRequest,
    ) => DataEffect;
    readonly deleteVisible: (
      context: ReservationViewerContext,
      reservationId: number,
    ) => DataEffect;
    readonly deleteOwned: (
      identity: OrganizationWorkspaceIdentity,
      reservationId: number,
    ) => DataEffect;
    readonly updateOwned: (
      identity: OrganizationWorkspaceIdentity,
      reservationId: number,
      payload: UpdateReservationRequest,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/organization-workspace/data") {}

export class MyReservationsData extends Context.Service<
  MyReservationsData,
  {
    readonly listMine: (
      identity: OrganizationWorkspaceIdentity,
      query: MyReservationsQuery,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/my-reservations/data") {
  static readonly layerDatabase = Layer.effect(
    MyReservationsData,
    Effect.map(ApiDatabase, (database) =>
      MyReservationsData.of({
        listMine: ({ userId, discordId }, query) =>
          Effect.gen(function* () {
            const [guildRows, preferredIds] = yield* Effect.all(
              [
                selectAccessibleGuilds(database, discordId).pipe(
                  Effect.map((rows) =>
                    rows.map(({ guild }) => ({ id: guild.id })),
                  ),
                ),
                readGuildOrderPreference(database, userId),
              ],
              { concurrency: "unbounded" },
            );

            if (guildRows.length === 0) return { items: [] };

            const guildIds = sortGuildsByPreference(
              guildRows,
              preferredIds,
            ).map(({ id }) => id);

            const now = new Date(yield* Clock.currentTimeMillis);

            const timeCondition =
              query.status === "past"
                ? and(
                    gte(
                      reservationTable.endsAt,
                      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                    ),
                    lt(reservationTable.endsAt, now),
                  )
                : gte(reservationTable.endsAt, now);

            const rows = yield* database
              .select({ reservation: reservationTable, guild: guildTable })
              .from(reservationTable)
              .innerJoin(
                guildTable,
                eq(guildTable.id, reservationTable.guildId),
              )
              .where(
                and(
                  inArray(reservationTable.guildId, guildIds),
                  timeCondition,
                  or(
                    eq(reservationTable.createdByUserId, userId),
                    eq(reservationTable.legacyCreatedByDiscordId, discordId),
                  ),
                ),
              )
              .orderBy(
                query.status === "past"
                  ? desc(reservationTable.endsAt)
                  : asc(reservationTable.startsAt),
                query.status === "past"
                  ? desc(reservationTable.id)
                  : asc(reservationTable.id),
              );

            const viewer = {
              guildId: null,
              userId,
              discordId,
              canModerateCurrentGuild: false,
            };

            return {
              items: rows.map(({ reservation, guild }) =>
                presentReservation({ ...reservation, guild }, viewer),
              ),
            };
          }).pipe(
            Effect.withSpan("listMyReservations.persistence", {
              attributes: { adapter: "ApiDatabase", retryCount: 0 },
            }),
            Effect.mapError(
              (cause) => new OrganizationWorkspaceOperationError({ cause }),
            ),
          ),
      }),
    ),
  );
}

export class ReservationReadData extends Context.Service<
  ReservationReadData,
  {
    readonly listSpots: (context: ReservationViewerContext) => DataEffect;
    readonly listWindow: (
      context: ReservationViewerContext,
      spotId: string,
      from: string,
      to: string,
    ) => DataEffect;
    readonly pinSpot: (
      userId: string,
      guildId: string,
      spotId: string,
    ) => DataEffect;
    readonly unpinSpot: (
      userId: string,
      guildId: string,
      spotId: string,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/reservation-read/data") {}

export class ReservationSharingData extends Context.Service<
  ReservationSharingData,
  {
    readonly listShares: (guildId: string) => DataEffect;
    readonly createInvitation: (guildId: string, userId: string) => DataEffect;
    readonly revokeInvitation: (
      guildId: string,
      invitationId: string,
    ) => DataEffect;
    readonly revokeShare: (guildId: string, shareId: string) => DataEffect;
    readonly previewInvitation: (
      token: string,
      discordId: string,
    ) => DataEffect;
    readonly acceptInvitation: (
      token: string,
      payload: AcceptReservationShareInvitationRequest,
      identity: OrganizationWorkspaceIdentity,
    ) => DataEffect;
  }
>()("@lootlog/api/http-api/reservation-sharing/data") {}
