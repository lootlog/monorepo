import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartyReadyRoomReserveInvitationsSchema = z.object({
  targets: z
    .array(
      z.object({
        participantId: z.string().min(1).max(100),
        applicationVersion: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(20),
});

const PartyReadyRoomAcknowledgeInvitationSchema = z.object({
  participantId: z.string().min(1).max(100),
  commandId: z.string().min(1).max(100),
  outcome: z.enum(["SENT", "FAILED"]),
});

const PartyReadyRoomAnnotateInvitationSchema = z.object({
  participantId: z.string().min(1).max(100),
  expectedRevision: z.number().int().min(1),
  outcome: z.enum(["SENT", "FAILED"]),
});

const PartyReadyRoomReconcileInvitationSchema = z.object({
  participantId: z.string().min(1).max(100),
  commandId: z.string().min(1).max(100),
  expectedRevision: z.number().int().min(1),
  outcome: z.enum(["NOT_MARKED", "SENT", "FAILED"]),
});

export class PartyReadyRoomReserveInvitationsDto extends createZodDto(
  PartyReadyRoomReserveInvitationsSchema,
) {}

export class PartyReadyRoomAcknowledgeInvitationDto extends createZodDto(
  PartyReadyRoomAcknowledgeInvitationSchema,
) {}

export class PartyReadyRoomAnnotateInvitationDto extends createZodDto(
  PartyReadyRoomAnnotateInvitationSchema,
) {}

export class PartyReadyRoomReconcileInvitationDto extends createZodDto(
  PartyReadyRoomReconcileInvitationSchema,
) {}
