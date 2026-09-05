/** Shared input and output schemas for the reservation-sharing feature. */
import * as Schema from "effect/Schema";
import { NonEmptyString, DateTimeString } from "@lootlog/schema/http-scalars";

const PartnerOrganization = Schema.Struct({
  name: Schema.String,
  iconUrl: Schema.Union([Schema.String, Schema.Null]),
});

export type ReservationSharesResponse = typeof ReservationSharesResponse.Type;

export const ReservationSharesResponse = Schema.Struct({
  shares: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      partner: PartnerOrganization,
      createdAt: DateTimeString,
    }),
  ),
  pendingInvitations: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      expiresAt: DateTimeString,
      createdAt: DateTimeString,
    }),
  ),
}).annotate({ identifier: "ReservationSharesResponseDto" });

export type CreatedReservationShareInvitationResponse =
  typeof CreatedReservationShareInvitationResponse.Type;

export const CreatedReservationShareInvitationResponse = Schema.Struct({
  id: Schema.String,
  expiresAt: DateTimeString,
  createdAt: DateTimeString,
  invitePath: Schema.String.check(
    Schema.isPattern(
      new RegExp("^\\/reservation-sharing\\/invitations\\/[\\w-]+$"),
    ).annotate({
      expected:
        "a string matching the RegExp ^\\/reservation-sharing\\/invitations\\/[\\w-]+$",
    }),
  ),
}).annotate({ identifier: "CreateReservationShareInvitationResponseDto" });

export type ReservationShareInvitationPreviewResponse =
  typeof ReservationShareInvitationPreviewResponse.Type;

export const ReservationShareInvitationPreviewResponse = Schema.Struct({
  sourceOrganization: PartnerOrganization,
  expiresAt: DateTimeString,
  eligibleTargetOrganizations: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      iconUrl: Schema.Union([Schema.String, Schema.Null]),
      id: Schema.String,
    }),
  ),
}).annotate({ identifier: "ReservationShareInvitationPreviewResponseDto" });

export type AcceptReservationShareInvitationRequest =
  typeof AcceptReservationShareInvitationRequest.Type;

export const AcceptReservationShareInvitationRequest = Schema.Struct({
  targetGuildId: NonEmptyString,
}).annotate({ identifier: "AcceptReservationShareInvitationDto" });

export type AcceptedReservationShareResponse =
  typeof AcceptedReservationShareResponse.Type;

export const AcceptedReservationShareResponse = Schema.Struct({
  id: Schema.String,
  partner: PartnerOrganization,
  createdAt: DateTimeString,
}).annotate({ identifier: "AcceptReservationShareInvitationResponseDto" });

export type ReservationSharingOrganizationPath =
  typeof ReservationSharingOrganizationPath.Type;

export const ReservationSharingOrganizationPath = Schema.Struct({
  guildId: Schema.String,
});

export type ReservationShareInvitationPath =
  typeof ReservationShareInvitationPath.Type;

export const ReservationShareInvitationPath = Schema.Struct({
  invitationId: Schema.String,
  guildId: Schema.String,
});

export type ReservationSharePath = typeof ReservationSharePath.Type;

export const ReservationSharePath = Schema.Struct({
  shareId: Schema.String,
  guildId: Schema.String,
});

export type ReservationShareTokenPath = typeof ReservationShareTokenPath.Type;

export const ReservationShareTokenPath = Schema.Struct({
  token: Schema.String,
});
