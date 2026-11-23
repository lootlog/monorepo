import {
  OrganizationWorkspaceData,
  MyReservationsData,
  ReservationReadData,
} from "#src/reservations/reservations-data";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import {
  ReservationBoundary,
  MyReservationsBoundary,
  ReservationSpotsBoundary,
  ReservationWindowBoundary,
} from "./reservation-response.schema.js";
import { Effect } from "effect";
import { Capability } from "@lootlog/schema/permissions";
import type { ReservationViewerContext } from "#src/reservations/reservation-viewer";
import type {
  CreateReservationRequest,
  MyReservationsQuery,
  ReservationWindowQuery,
  UpdateReservationRequest,
} from "#src/contracts/reservations/schemas";
import {
  OrganizationWorkspaceGuildAccess,
  identity,
  requireGuild,
  decode,
  toOrganizationWorkspaceHttpResponse,
} from "../../access/organization-workspace.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

const data = <A>(
  operation: (
    service: OrganizationWorkspaceData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(OrganizationWorkspaceData, operation);

const myReservationsData = <A>(
  operation: (
    service: MyReservationsData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(MyReservationsData, operation);

const readData = <A>(
  operation: (
    service: ReservationReadData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(ReservationReadData, operation);

const toViewer = (
  access: OrganizationWorkspaceGuildAccess,
): ReservationViewerContext => ({
  guildId: access.guildId,
  userId: access.userId,
  discordId: access.discordId,
  permissions: [...access.permissions],
});

export const listReservationSpots = Effect.fn("listReservationSpots")(
  function* (guildId: string) {
    const access = yield* requireGuild(guildId, [
      Capability.LOOTLOG_RESERVATIONS_READ,
    ]);

    const value = yield* readData((service) =>
      service.listSpots(toViewer(access)),
    );

    return yield* decode(ReservationSpotsBoundary, value);
  },
);

const listSpotReservations = Effect.fn("listSpotReservations")(function* (
  guildId: string,
  spotId: string,
  query: ReservationWindowQuery,
) {
  const access = yield* requireGuild(guildId, [
    Capability.LOOTLOG_RESERVATIONS_READ,
  ]);

  const value = yield* readData((service) =>
    service.listWindow(toViewer(access), spotId, query.from, query.to),
  );

  return yield* decode(ReservationWindowBoundary, value);
});

export const createReservation = Effect.fn("createReservation")(function* (
  guildId: string,
  spotId: string,
  payload: CreateReservationRequest,
) {
  const access = yield* requireGuild(guildId, [
    Capability.LOOTLOG_RESERVATIONS_READ,
    Capability.LOOTLOG_RESERVATIONS_WRITE,
  ]);

  const value = yield* data((service) =>
    service.create(toViewer(access), spotId, payload),
  );

  return yield* decode(ReservationBoundary, value);
});

const deleteVisibleReservation = Effect.fn("deleteVisibleReservation")(
  function* (guildId: string, reservationId: number) {
    const access = yield* requireGuild(guildId, [
      Capability.LOOTLOG_RESERVATIONS_READ,
      Capability.LOOTLOG_RESERVATIONS_WRITE,
    ]);

    yield* data((service) =>
      service.deleteVisible(toViewer(access), reservationId),
    );
  },
);

const setReservationSpotPin = Effect.fn("setReservationSpotPin")(function* (
  guildId: string,
  spotId: string,
  pinned: boolean,
) {
  const access = yield* requireGuild(guildId, [
    Capability.LOOTLOG_RESERVATIONS_READ,
  ]);

  yield* readData((service) =>
    pinned
      ? service.pinSpot(access.userId, access.guildId, spotId)
      : service.unpinSpot(access.userId, access.guildId, spotId),
  );
});

const pinReservationSpot = (guildId: string, spotId: string) =>
  setReservationSpotPin(guildId, spotId, true);

const unpinReservationSpot = (guildId: string, spotId: string) =>
  setReservationSpotPin(guildId, spotId, false);

const listMyReservations = Effect.fn("listMyReservations")(function* (
  query: MyReservationsQuery,
) {
  const current = yield* identity;

  const value = yield* myReservationsData((service) =>
    service.listMine(current, query),
  );

  return yield* decode(MyReservationsBoundary, value);
});

const deleteMyReservation = Effect.fn("deleteMyReservation")(function* (
  reservationId: number,
) {
  const current = yield* identity;
  yield* data((service) => service.deleteOwned(current, reservationId));
});

const updateMyReservation = Effect.fn("updateMyReservation")(function* (
  reservationId: number,
  payload: UpdateReservationRequest,
) {
  const current = yield* identity;

  const value = yield* data((service) =>
    service.updateOwned(current, reservationId, payload),
  );

  return yield* decode(ReservationBoundary, value);
});

export const ReservationsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "reservations",
  (handlers) =>
    handlers
      .handle("listReservationSpots", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          listReservationSpots(params.guildId),
        ),
      )
      .handle("listSpotReservations", ({ params, query }) =>
        toOrganizationWorkspaceHttpResponse(
          listSpotReservations(params.guildId, params.spotId, query),
        ),
      )
      .handle("createReservation", ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          createReservation(params.guildId, params.spotId, payload),
        ),
      )
      .handle("deleteReservation", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          deleteVisibleReservation(params.guildId, params.reservationId),
        ),
      )
      .handle("pinReservationSpot", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          pinReservationSpot(params.guildId, params.spotId),
        ),
      )
      .handle("unpinReservationSpot", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          unpinReservationSpot(params.guildId, params.spotId),
        ),
      )
      .handle("listMyReservations", ({ query }) =>
        toOrganizationWorkspaceHttpResponse(listMyReservations(query)),
      )
      .handle("deleteMyReservation", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          deleteMyReservation(params.reservationId),
        ),
      )
      .handle("updateMyReservation", ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          updateMyReservation(params.reservationId, payload),
        ),
      ),
);
