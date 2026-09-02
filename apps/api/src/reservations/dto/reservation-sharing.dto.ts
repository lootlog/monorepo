import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import { isoDatetimeCodec } from "#src/shared/dto/zod-response-codecs";

const ReservationShareOrganizationSchema = z.object({
  name: z.string(),
  iconUrl: z.string().nullable(),
});

const ReservationShareSchema = z.object({
  id: z.string(),
  partner: ReservationShareOrganizationSchema,
  createdAt: isoDatetimeCodec,
});

const ReservationShareInvitationSchema = z.object({
  id: z.string(),
  expiresAt: isoDatetimeCodec,
  createdAt: isoDatetimeCodec,
});

export class ReservationSharesResponseDto extends createSchemaClass(
  z.object({
    shares: z.array(ReservationShareSchema),
    pendingInvitations: z.array(ReservationShareInvitationSchema),
  }),
  { codec: true },
) {}

export class CreateReservationShareInvitationResponseDto extends createSchemaClass(
  ReservationShareInvitationSchema.extend({
    invitePath: z
      .string()
      .regex(/^\/reservation-sharing\/invitations\/[\w-]+$/),
  }),
  { codec: true },
) {}

const EligibleReservationShareOrganizationSchema =
  ReservationShareOrganizationSchema.extend({ id: z.string() });

export class ReservationShareInvitationPreviewResponseDto extends createSchemaClass(
  z.object({
    sourceOrganization: ReservationShareOrganizationSchema,
    expiresAt: isoDatetimeCodec,
    eligibleTargetOrganizations: z.array(
      EligibleReservationShareOrganizationSchema,
    ),
  }),
  { codec: true },
) {}

export class AcceptReservationShareInvitationDto extends createSchemaClass(
  z.object({ targetGuildId: z.string().min(1) }),
) {}

export class AcceptReservationShareInvitationResponseDto extends createSchemaClass(
  ReservationShareSchema,
  { codec: true },
) {}
