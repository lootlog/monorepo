/** Transport schemas owned by the reservation-sharing HTTP module. */
import * as Schema from "effect/Schema";

export type ReservationSharesResponseDto = {
  readonly shares: ReadonlyArray<{
    readonly id: string;
    readonly partner: {
      readonly name: string;
      readonly iconUrl: string | null;
    };
    readonly createdAt: string;
  }>;
  readonly pendingInvitations: ReadonlyArray<{
    readonly id: string;
    readonly expiresAt: string;
    readonly createdAt: string;
  }>;
};

export const ReservationSharesResponseDto = Schema.Struct({
  shares: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      partner: Schema.Struct({
        name: Schema.String,
        iconUrl: Schema.Union([Schema.String, Schema.Null]),
      }),
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
    }),
  ),
  pendingInvitations: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      expiresAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
    }),
  ),
}).annotate({ identifier: "ReservationSharesResponseDto" });

export type CreateReservationShareInvitationResponseDto = {
  readonly id: string;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly invitePath: string;
};

export const CreateReservationShareInvitationResponseDto = Schema.Struct({
  id: Schema.String,
  expiresAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  invitePath: Schema.String.check(
    Schema.isPattern(
      new RegExp("^\\/reservation-sharing\\/invitations\\/[\\w-]+$"),
    ).annotate({
      expected:
        "a string matching the RegExp ^\\/reservation-sharing\\/invitations\\/[\\w-]+$",
    }),
  ),
}).annotate({ identifier: "CreateReservationShareInvitationResponseDto" });

export type ReservationShareInvitationPreviewResponseDto = {
  readonly sourceOrganization: {
    readonly name: string;
    readonly iconUrl: string | null;
  };
  readonly expiresAt: string;
  readonly eligibleTargetOrganizations: ReadonlyArray<{
    readonly name: string;
    readonly iconUrl: string | null;
    readonly id: string;
  }>;
};

export const ReservationShareInvitationPreviewResponseDto = Schema.Struct({
  sourceOrganization: Schema.Struct({
    name: Schema.String,
    iconUrl: Schema.Union([Schema.String, Schema.Null]),
  }),
  expiresAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  eligibleTargetOrganizations: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      iconUrl: Schema.Union([Schema.String, Schema.Null]),
      id: Schema.String,
    }),
  ),
}).annotate({ identifier: "ReservationShareInvitationPreviewResponseDto" });

export type AcceptReservationShareInvitationDto = {
  readonly targetGuildId: string;
};

export const AcceptReservationShareInvitationDto = Schema.Struct({
  targetGuildId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "AcceptReservationShareInvitationDto" });

export type AcceptReservationShareInvitationResponseDto = {
  readonly id: string;
  readonly partner: { readonly name: string; readonly iconUrl: string | null };
  readonly createdAt: string;
};

export const AcceptReservationShareInvitationResponseDto = Schema.Struct({
  id: Schema.String,
  partner: Schema.Struct({
    name: Schema.String,
    iconUrl: Schema.Union([Schema.String, Schema.Null]),
  }),
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
}).annotate({ identifier: "AcceptReservationShareInvitationResponseDto" });

export type ListReservationSharesPathParams = { readonly guildId: string };

export const ListReservationSharesPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type ListReservationShares200 = ReservationSharesResponseDto;

export const ListReservationShares200 = ReservationSharesResponseDto;

export type CreateReservationShareInvitationPathParams = {
  readonly guildId: string;
};

export const CreateReservationShareInvitationPathParams = Schema.Struct({
  guildId: Schema.String,
});

export type CreateReservationShareInvitation201 =
  CreateReservationShareInvitationResponseDto;

export const CreateReservationShareInvitation201 =
  CreateReservationShareInvitationResponseDto;

export type RevokeReservationShareInvitationPathParams = {
  readonly invitationId: string;
  readonly guildId: string;
};

export const RevokeReservationShareInvitationPathParams = Schema.Struct({
  invitationId: Schema.String,
  guildId: Schema.String,
});

export type RevokeReservationSharePathParams = {
  readonly shareId: string;
  readonly guildId: string;
};

export const RevokeReservationSharePathParams = Schema.Struct({
  shareId: Schema.String,
  guildId: Schema.String,
});

export type PreviewReservationShareInvitationPathParams = {
  readonly token: string;
};

export const PreviewReservationShareInvitationPathParams = Schema.Struct({
  token: Schema.String,
});

export type PreviewReservationShareInvitation200 =
  ReservationShareInvitationPreviewResponseDto;

export const PreviewReservationShareInvitation200 =
  ReservationShareInvitationPreviewResponseDto;

export type AcceptReservationShareInvitationPathParams = {
  readonly token: string;
};

export const AcceptReservationShareInvitationPathParams = Schema.Struct({
  token: Schema.String,
});

export type AcceptReservationShareInvitationRequestJson =
  AcceptReservationShareInvitationDto;

export const AcceptReservationShareInvitationRequestJson =
  AcceptReservationShareInvitationDto;

export type AcceptReservationShareInvitation201 =
  AcceptReservationShareInvitationResponseDto;

export const AcceptReservationShareInvitation201 =
  AcceptReservationShareInvitationResponseDto;
