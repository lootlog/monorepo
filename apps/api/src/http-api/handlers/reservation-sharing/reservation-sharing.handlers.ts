import { ReservationSharingData } from "#src/reservations/reservations-data";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import {
  AcceptedReservationShareBoundary,
  CreatedReservationShareInvitationBoundary,
  ReservationSharesBoundary,
  ReservationShareInvitationPreviewBoundary,
} from "../reservations/reservation-response.schema.js";
import { Effect } from "effect";
import { AccessRequirement } from "@lootlog/domain/access-policy";
import type { AcceptReservationShareInvitationRequest } from "#src/contracts/reservation-sharing/schemas";
import {
  identity,
  requireGuild,
  decode,
  toOrganizationWorkspaceHttpResponse,
} from "../../access/organization-workspace.access.js";
import { HttpApiBuilder } from "effect/http-api";
import { LootlogApi } from "../../lootlog-api.js";

const sharingData = <A>(
  operation: (
    service: ReservationSharingData["Service"],
  ) => Effect.Effect<A, OrganizationWorkspaceOperationError>,
) => Effect.flatMap(ReservationSharingData, operation);

const requireSharingAdmin = (guildId: string) =>
  requireGuild(guildId, { anyOf: AccessRequirement.ADMINISTER });

export const listReservationShares = Effect.fn("listReservationShares")(
  function* (guildId: string) {
    const access = yield* requireSharingAdmin(guildId);

    const value = yield* sharingData((service) =>
      service.listShares(access.guildId),
    );

    return yield* decode(ReservationSharesBoundary, value);
  },
);

export const previewReservationShareInvitation = Effect.fn(
  "previewReservationShareInvitation",
)(function* (token: string) {
  const current = yield* identity;

  const value = yield* sharingData((service) =>
    service.previewInvitation(token, current.discordId),
  );

  return yield* decode(ReservationShareInvitationPreviewBoundary, value);
});

export const acceptReservationShareInvitation = Effect.fn(
  "acceptReservationShareInvitation",
)(function* (token: string, payload: AcceptReservationShareInvitationRequest) {
  const current = yield* identity;

  const value = yield* sharingData((service) =>
    service.acceptInvitation(token, payload, current),
  );

  return yield* decode(AcceptedReservationShareBoundary, value);
});

const createReservationShareInvitation = Effect.fn(
  "createReservationShareInvitation",
)(function* (guildId: string) {
  const access = yield* requireSharingAdmin(guildId);

  const value = yield* sharingData((service) =>
    service.createInvitation(access.guildId, access.userId),
  );

  return yield* decode(CreatedReservationShareInvitationBoundary, value);
});

const revokeReservationShareInvitation = Effect.fn(
  "revokeReservationShareInvitation",
)(function* (guildId: string, invitationId: string) {
  const access = yield* requireSharingAdmin(guildId);
  yield* sharingData((service) =>
    service.revokeInvitation(access.guildId, invitationId),
  );
});

const revokeReservationShare = Effect.fn("revokeReservationShare")(function* (
  guildId: string,
  shareId: string,
) {
  const access = yield* requireSharingAdmin(guildId);
  yield* sharingData((service) => service.revokeShare(access.guildId, shareId));
});

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
