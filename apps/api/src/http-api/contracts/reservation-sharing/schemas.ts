/** Transport schemas owned by the reservation-sharing HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString } from "../scalars.js";

export type ReservationSharesResponseDto =
  typeof ReservationSharesResponseDto.Type;

export const ReservationSharesResponseDto = Schema.Struct({
  shares: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      partner: Schema.Struct({
        name: Schema.String,
        iconUrl: Schema.Union([Schema.String, Schema.Null]),
      }),
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

export type CreateReservationShareInvitationResponseDto =
  typeof CreateReservationShareInvitationResponseDto.Type;

export const CreateReservationShareInvitationResponseDto = Schema.Struct({
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

export type ReservationShareInvitationPreviewResponseDto =
  typeof ReservationShareInvitationPreviewResponseDto.Type;

export const ReservationShareInvitationPreviewResponseDto = Schema.Struct({
  sourceOrganization: Schema.Struct({
    name: Schema.String,
    iconUrl: Schema.Union([Schema.String, Schema.Null]),
  }),
  expiresAt: DateTimeString,
  eligibleTargetOrganizations: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      iconUrl: Schema.Union([Schema.String, Schema.Null]),
      id: Schema.String,
    }),
  ),
}).annotate({ identifier: "ReservationShareInvitationPreviewResponseDto" });

export type AcceptReservationShareInvitationDto =
  typeof AcceptReservationShareInvitationDto.Type;

export const AcceptReservationShareInvitationDto = Schema.Struct({
  targetGuildId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "AcceptReservationShareInvitationDto" });

export type AcceptReservationShareInvitationResponseDto =
  typeof AcceptReservationShareInvitationResponseDto.Type;

export const AcceptReservationShareInvitationResponseDto = Schema.Struct({
  id: Schema.String,
  partner: Schema.Struct({
    name: Schema.String,
    iconUrl: Schema.Union([Schema.String, Schema.Null]),
  }),
  createdAt: DateTimeString,
}).annotate({ identifier: "AcceptReservationShareInvitationResponseDto" });

export type ListReservationSharesPathParams =
  typeof ListReservationSharesPathParams.Type;

export const ListReservationSharesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ListReservationShares200 = typeof ListReservationShares200.Type;

export const ListReservationShares200 = ReservationSharesResponseDto;

export type CreateReservationShareInvitationPathParams =
  typeof CreateReservationShareInvitationPathParams.Type;

export const CreateReservationShareInvitationPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type CreateReservationShareInvitation201 =
  typeof CreateReservationShareInvitation201.Type;

export const CreateReservationShareInvitation201 =
  CreateReservationShareInvitationResponseDto;

export type RevokeReservationShareInvitationPathParams =
  typeof RevokeReservationShareInvitationPathParams.Type;

export const RevokeReservationShareInvitationPathParams = Schema.Struct({
  invitationId: Schema.String,
  guildId: Schema.String,
});

export type RevokeReservationSharePathParams =
  typeof RevokeReservationSharePathParams.Type;

export const RevokeReservationSharePathParams = Schema.Struct({
  shareId: Schema.String,
  guildId: Schema.String,
});

export type PreviewReservationShareInvitationPathParams =
  typeof PreviewReservationShareInvitationPathParams.Type;

export const PreviewReservationShareInvitationPathParams = Schema.Struct({
  token: Schema.String,
});

export type PreviewReservationShareInvitation200 =
  typeof PreviewReservationShareInvitation200.Type;

export const PreviewReservationShareInvitation200 =
  ReservationShareInvitationPreviewResponseDto;

export type AcceptReservationShareInvitationPathParams =
  typeof AcceptReservationShareInvitationPathParams.Type;

export const AcceptReservationShareInvitationPathParams = Schema.Struct({
  token: Schema.String,
});

export type AcceptReservationShareInvitationRequestJson =
  typeof AcceptReservationShareInvitationRequestJson.Type;

export const AcceptReservationShareInvitationRequestJson =
  AcceptReservationShareInvitationDto;

export type AcceptReservationShareInvitation201 =
  typeof AcceptReservationShareInvitation201.Type;

export const AcceptReservationShareInvitation201 =
  AcceptReservationShareInvitationResponseDto;
