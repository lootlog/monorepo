/** Endpoints owned by the reservation-sharing HTTP module. */
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import {
  BearerSecurityMiddleware,
  OrganizationWorkspaceErrorResponse,
} from "../shared.js";
import {
  AcceptedReservationShareResponse,
  ReservationShareTokenPath,
  AcceptReservationShareInvitationRequest,
  CreatedReservationShareInvitationResponse,
  ReservationSharingOrganizationPath,
  ReservationSharesResponse,
  ReservationShareInvitationPreviewResponse,
  ReservationShareInvitationPath,
  ReservationSharePath,
} from "#src/contracts/reservation-sharing/schemas";

export class ReservationSharingGroup extends HttpApiGroup.make(
  "reservation-sharing",
).add(
  HttpApiEndpoint.get(
    "listReservationShares",
    "/guilds/:guildId/reservation-shares",
    {
      params: ReservationSharingOrganizationPath,
      error: [
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(401)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(403)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: ReservationSharesResponse,
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
      params: ReservationSharingOrganizationPath,
      error: [
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(401)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(403)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
      success: CreatedReservationShareInvitationResponse.pipe(
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
      params: ReservationShareInvitationPath,
      error: [
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(401)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(403)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      params: ReservationSharePath,
      error: [
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(401)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(403)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(404)),
      ],
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
      params: ReservationShareTokenPath,
      error: [
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(401)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(404)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(409)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(410)),
      ],
      success: ReservationShareInvitationPreviewResponse,
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "previewReservationShareInvitation")
    .annotate(OpenApi.Summary, "Preview a reservation sharing invitation"),
  HttpApiEndpoint.post(
    "acceptReservationShareInvitation",
    "/reservation-share-invitations/:token",
    {
      params: ReservationShareTokenPath,
      payload: AcceptReservationShareInvitationRequest,
      error: [
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(401)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(404)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(409)),
        OrganizationWorkspaceErrorResponse.pipe(HttpApiSchema.status(410)),
      ],
      success: AcceptedReservationShareResponse.pipe(HttpApiSchema.status(201)),
    },
  )
    .middleware(BearerSecurityMiddleware)
    .annotate(OpenApi.Identifier, "acceptReservationShareInvitation")
    .annotate(OpenApi.Summary, "Accept a reservation sharing invitation"),
) {}
