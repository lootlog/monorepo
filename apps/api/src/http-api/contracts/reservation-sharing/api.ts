/** Endpoints owned by the reservation-sharing HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { BearerSecurityMiddleware } from "../shared.js";
import {
  AcceptReservationShareInvitation201,
  AcceptReservationShareInvitationPathParams,
  AcceptReservationShareInvitationRequestJson,
  CreateReservationShareInvitation201,
  CreateReservationShareInvitationPathParams,
  ListReservationShares200,
  ListReservationSharesPathParams,
  PreviewReservationShareInvitation200,
  PreviewReservationShareInvitationPathParams,
  RevokeReservationShareInvitationPathParams,
  RevokeReservationSharePathParams,
} from "./schemas.js";

export class ReservationSharingGroup extends HttpApiGroup.make(
  "reservation-sharing",
).add(
  HttpApiEndpoint.get(
    "listReservationShares",
    "/guilds/:guildId/reservation-shares",
    {
      params: ListReservationSharesPathParams,
      success: ListReservationShares200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "listReservationShares")
    .annotate(
      OpenApi.Summary,
      "List reservation calendar partners and pending invitations",
    ),
  HttpApiEndpoint.post(
    "createReservationShareInvitation",
    "/guilds/:guildId/reservation-share-invitations",
    {
      params: CreateReservationShareInvitationPathParams,
      success: CreateReservationShareInvitation201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "createReservationShareInvitation")
    .annotate(
      OpenApi.Summary,
      "Create a single-use reservation sharing invitation",
    ),
  HttpApiEndpoint.delete(
    "revokeReservationShareInvitation",
    "/guilds/:guildId/reservation-share-invitations/:invitationId",
    {
      params: RevokeReservationShareInvitationPathParams,
      success: HttpApiSchema.Empty(204),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "revokeReservationShareInvitation")
    .annotate(
      OpenApi.Summary,
      "Revoke a pending reservation sharing invitation",
    ),
  HttpApiEndpoint.delete(
    "revokeReservationShare",
    "/guilds/:guildId/reservation-shares/:shareId",
    {
      params: RevokeReservationSharePathParams,
      success: HttpApiSchema.Empty(204),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "revokeReservationShare")
    .annotate(OpenApi.Summary, "Stop sharing reservation calendars"),
  HttpApiEndpoint.get(
    "previewReservationShareInvitation",
    "/reservation-share-invitations/:token",
    {
      params: PreviewReservationShareInvitationPathParams,
      success: PreviewReservationShareInvitation200,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "previewReservationShareInvitation")
    .annotate(OpenApi.Summary, "Preview a reservation sharing invitation"),
  HttpApiEndpoint.post(
    "acceptReservationShareInvitation",
    "/reservation-share-invitations/:token",
    {
      params: AcceptReservationShareInvitationPathParams,
      payload: AcceptReservationShareInvitationRequestJson,
      success: AcceptReservationShareInvitation201.pipe(
        HttpApiSchema.status(201),
      ),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "acceptReservationShareInvitation")
    .annotate(OpenApi.Summary, "Accept a reservation sharing invitation"),
) {}
