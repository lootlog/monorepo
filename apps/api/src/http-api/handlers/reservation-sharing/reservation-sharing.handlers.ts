import { HttpApiBuilder } from "effect/unstable/httpapi";
import { LootlogApi } from "../../lootlog-api.js";
import {
  acceptReservationShareInvitation,
  createReservationShareInvitation,
  listReservationShares,
  previewReservationShareInvitation,
  revokeReservationShare,
  revokeReservationShareInvitation,
  toOrganizationWorkspaceHttpResponse,
} from "../organization-workspace/organization-workspace.operations.js";

export const ReservationSharingHandlers = HttpApiBuilder.group(
  LootlogApi,
  "reservation-sharing",
  (handlers) =>
    handlers
      .handle("listReservationShares", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          listReservationShares(params.guildId),
        ),
      )
      .handle("createReservationShareInvitation", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          createReservationShareInvitation(params.guildId),
        ),
      )
      .handle("revokeReservationShareInvitation", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          revokeReservationShareInvitation(params.guildId, params.invitationId),
        ),
      )
      .handle("revokeReservationShare", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          revokeReservationShare(params.guildId, params.shareId),
        ),
      )
      .handle("previewReservationShareInvitation", ({ params }) =>
        toOrganizationWorkspaceHttpResponse(
          previewReservationShareInvitation(params.token),
        ),
      )
      .handle("acceptReservationShareInvitation", ({ params, payload }) =>
        toOrganizationWorkspaceHttpResponse(
          acceptReservationShareInvitation(params.token, payload),
        ),
      ),
);
