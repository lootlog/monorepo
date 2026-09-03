/** Endpoints owned by the reservations HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  CreateReservation201,
  CreateReservationPathParams,
  CreateReservationRequestJson,
  DeleteMyReservationPathParams,
  DeleteReservationPathParams,
  ListMyReservations200,
  ListMyReservationsQuery,
  ListReservationSpots200,
  ListReservationSpotsPathParams,
  ListSpotReservations200,
  ListSpotReservationsPathParams,
  ListSpotReservationsQuery,
  PinReservationSpotPathParams,
  UnpinReservationSpotPathParams,
  UpdateMyReservation200,
  UpdateMyReservationPathParams,
  UpdateMyReservationRequestJson,
} from "./schemas.js";

export class ReservationsGroup extends HttpApiGroup.make("reservations").add(
  HttpApiEndpoint.get(
    "listReservationSpots",
    "/guilds/:guildId/reservation-spots",
    {
      params: ListReservationSpotsPathParams,
      success: ListReservationSpots200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listReservationSpots")
    .annotate(
      OpenApi.Summary,
      "List reservation spots with current availability",
    ),
  HttpApiEndpoint.get(
    "listSpotReservations",
    "/guilds/:guildId/reservation-spots/:spotId/reservations",
    {
      params: ListSpotReservationsPathParams,
      query: ListSpotReservationsQuery,
      success: ListSpotReservations200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listSpotReservations")
    .annotate(
      OpenApi.Summary,
      "List reservations for one spot and time window",
    ),
  HttpApiEndpoint.post(
    "createReservation",
    "/guilds/:guildId/reservation-spots/:spotId/reservations",
    {
      params: CreateReservationPathParams,
      payload: CreateReservationRequestJson,
      success: CreateReservation201.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "createReservation")
    .annotate(
      OpenApi.Summary,
      "Create a reservation owned by the authenticated user",
    ),
  HttpApiEndpoint.delete(
    "deleteReservation",
    "/guilds/:guildId/reservations/:reservationId",
    { params: DeleteReservationPathParams, success: HttpApiSchema.Empty(204) },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "deleteReservation")
    .annotate(
      OpenApi.Summary,
      "Cancel an owned or locally moderated reservation",
    ),
  HttpApiEndpoint.put(
    "pinReservationSpot",
    "/guilds/:guildId/reservation-spot-pins/:spotId",
    { params: PinReservationSpotPathParams, success: HttpApiSchema.Empty(204) },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "pinReservationSpot")
    .annotate(OpenApi.Summary, "Pin a reservation spot for the current user"),
  HttpApiEndpoint.delete(
    "unpinReservationSpot",
    "/guilds/:guildId/reservation-spot-pins/:spotId",
    {
      params: UnpinReservationSpotPathParams,
      success: HttpApiSchema.Empty(204),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "unpinReservationSpot")
    .annotate(OpenApi.Summary, "Unpin a reservation spot for the current user"),
  HttpApiEndpoint.get("listMyReservations", "/users/@me/reservations", {
    query: ListMyReservationsQuery,
    success: ListMyReservations200,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listMyReservations")
    .annotate(OpenApi.Summary, "List the current user's reservations"),
  HttpApiEndpoint.delete(
    "deleteMyReservation",
    "/users/@me/reservations/:reservationId",
    {
      params: DeleteMyReservationPathParams,
      success: HttpApiSchema.Empty(204),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "deleteMyReservation")
    .annotate(OpenApi.Summary, "Cancel one of the current user's reservations"),
  HttpApiEndpoint.patch(
    "updateMyReservation",
    "/users/@me/reservations/:reservationId",
    {
      params: UpdateMyReservationPathParams,
      payload: UpdateMyReservationRequestJson,
      success: UpdateMyReservation200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "updateMyReservation")
    .annotate(OpenApi.Summary, "Update one of the current user's reservations"),
) {}
