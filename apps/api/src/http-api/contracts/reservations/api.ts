/** Endpoints owned by the reservations HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";
import { BearerSecurityMiddleware, HttpErrorResponse } from "../shared.js";
import {
  ReservationResponse,
  ReservationSpotParams,
  CreateReservationRequest,
  ReservationParams,
  OrganizationReservationParamsWithId,
  MyReservationsResponse,
  MyReservationsQuery,
  ReservationSpotsResponse,
  OrganizationReservationParams,
  ReservationWindowResponse,
  ReservationWindowQuery,
  UpdateReservationRequest,
} from "#src/contracts/reservations/schemas";

export class ReservationsGroup extends HttpApiGroup.make("reservations").add(
  HttpApiEndpoint.get(
    "listReservationSpots",
    "/guilds/:guildId/reservation-spots",
    {
      params: OrganizationReservationParams,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: ReservationSpotsResponse,
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
      params: ReservationSpotParams,
      query: ReservationWindowQuery,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(400)),
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: ReservationWindowResponse,
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
      params: ReservationSpotParams,
      payload: CreateReservationRequest,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
      success: ReservationResponse.pipe(HttpApiSchema.status(201)),
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
    {
      params: OrganizationReservationParamsWithId,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: HttpApiSchema.Empty(204),
    },
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
    {
      params: ReservationSpotParams,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: HttpApiSchema.Empty(204),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "pinReservationSpot")
    .annotate(OpenApi.Summary, "Pin a reservation spot for the current user"),
  HttpApiEndpoint.delete(
    "unpinReservationSpot",
    "/guilds/:guildId/reservation-spot-pins/:spotId",
    {
      params: ReservationSpotParams,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(403)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: HttpApiSchema.Empty(204),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "unpinReservationSpot")
    .annotate(OpenApi.Summary, "Unpin a reservation spot for the current user"),
  HttpApiEndpoint.get("listMyReservations", "/users/@me/reservations", {
    query: MyReservationsQuery,
    error: [HttpErrorResponse.pipe(HttpApiSchema.status(401))],
    success: MyReservationsResponse,
  })
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listMyReservations")
    .annotate(OpenApi.Summary, "List the current user's reservations"),
  HttpApiEndpoint.delete(
    "deleteMyReservation",
    "/users/@me/reservations/:reservationId",
    {
      params: ReservationParams,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      params: ReservationParams,
      payload: UpdateReservationRequest,
      error: [
        HttpErrorResponse.pipe(HttpApiSchema.status(401)),
        HttpErrorResponse.pipe(HttpApiSchema.status(404)),
        HttpErrorResponse.pipe(HttpApiSchema.status(409)),
        HttpErrorResponse.pipe(HttpApiSchema.status(422)),
      ],
      success: ReservationResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "updateMyReservation")
    .annotate(OpenApi.Summary, "Update one of the current user's reservations"),
) {}
