import { withAdapterSpan } from "@lootlog/instrumentation/operation";
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
import type { ReservationSpot } from "./reservation-catalog.js";
import type { AcceptReservationShareInvitationRequest } from "#src/contracts/reservation-sharing/schemas";
import type {
  CreateReservationRequest,
  MyReservationsQuery,
  UpdateReservationRequest,
} from "#src/contracts/reservations/schemas";

type DataEffect<A> = Effect.Effect<A, OrganizationWorkspaceOperationError>;

type PresentedReservation = ReturnType<typeof presentReservation>;

type ReservationSpotSummary = ReservationSpot & {
  readonly isPinned: boolean;
  readonly isAvailableNow: boolean;
  readonly availableUntil: Date | null;
  readonly activeReservationCount: number;
  readonly hasPartnerReservations: boolean;
  readonly currentReservation: PresentedReservation | null;
  readonly nextReservation: PresentedReservation | null;
};

type PartnerOrganization = {
  readonly name: string;
  readonly iconUrl: string | null;
};

type ReservationShareSummary = {
  readonly id: string;
  readonly partner: PartnerOrganization;
  readonly createdAt: Date;
};

type ReservationShareInvitationSummary = {
  readonly id: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
};

export class OrganizationWorkspaceData extends Context.Service<
  OrganizationWorkspaceData,
  {
    readonly create: (
      context: ReservationViewerContext,
      spotId: string,
      payload: CreateReservationRequest,
    ) => Effect.Effect<unknown, OrganizationWorkspaceOperationError>;
    readonly deleteVisible: (
      context: ReservationViewerContext,
      reservationId: number,
    ) => DataEffect<void>;
    readonly deleteOwned: (
      identity: OrganizationWorkspaceIdentity,
      reservationId: number,
    ) => DataEffect<void>;
    readonly updateOwned: (
      identity: OrganizationWorkspaceIdentity,
      reservationId: number,
      payload: UpdateReservationRequest,
    ) => DataEffect<PresentedReservation>;
  }
>()("@lootlog/api/http-api/organization-workspace/data") {}

export class MyReservationsData extends Context.Service<
  MyReservationsData,
  {
    readonly listMine: (
      identity: OrganizationWorkspaceIdentity,
      query: MyReservationsQuery,
    ) => DataEffect<{
      readonly items: ReadonlyArray<PresentedReservation>;
    }>;
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
            withAdapterSpan("listMyReservations.persistence", "ApiDatabase"),
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
    readonly listSpots: (
      context: ReservationViewerContext,
    ) => DataEffect<ReadonlyArray<ReservationSpotSummary>>;
    readonly listWindow: (
      context: ReservationViewerContext,
      spotId: string,
      from: string,
      to: string,
    ) => DataEffect<{
      readonly items: ReadonlyArray<PresentedReservation>;
      readonly window: { readonly from: Date; readonly to: Date };
    }>;
    readonly pinSpot: (
      userId: string,
      guildId: string,
      spotId: string,
    ) => DataEffect<void>;
    readonly unpinSpot: (
      userId: string,
      guildId: string,
      spotId: string,
    ) => DataEffect<void>;
  }
>()("@lootlog/api/http-api/reservation-read/data") {}

export class ReservationSharingData extends Context.Service<
  ReservationSharingData,
  {
    readonly listShares: (guildId: string) => DataEffect<{
      readonly shares: ReadonlyArray<ReservationShareSummary>;
      readonly pendingInvitations: ReadonlyArray<ReservationShareInvitationSummary>;
    }>;
    readonly createInvitation: (
      guildId: string,
      userId: string,
    ) => DataEffect<
      ReservationShareInvitationSummary & { readonly invitePath: string }
    >;
    readonly revokeInvitation: (
      guildId: string,
      invitationId: string,
    ) => DataEffect<void>;
    readonly revokeShare: (
      guildId: string,
      shareId: string,
    ) => DataEffect<void>;
    readonly previewInvitation: (
      token: string,
      discordId: string,
    ) => DataEffect<{
      readonly sourceOrganization: PartnerOrganization;
      readonly expiresAt: Date;
      readonly eligibleTargetOrganizations: ReadonlyArray<
        PartnerOrganization & { readonly id: string }
      >;
    }>;
    readonly acceptInvitation: (
      token: string,
      payload: AcceptReservationShareInvitationRequest,
      identity: OrganizationWorkspaceIdentity,
    ) => DataEffect<ReservationShareSummary>;
  }
>()("@lootlog/api/http-api/reservation-sharing/data") {}
