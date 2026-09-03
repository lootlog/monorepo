import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  createReservation,
  deleteMyReservation,
  deleteVisibleReservation,
  listMyReservations,
  listReservationSpots,
  listSpotReservations,
  pinReservationSpot,
  toOrganizationWorkspaceHttpResponse,
  unpinReservationSpot,
  updateMyReservation,
} from "../organization-workspace/organization-workspace.operations.js";

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
