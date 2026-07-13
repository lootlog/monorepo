import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartyReadyRoomReserveInvitationsSchema = z.object({
  expectedRevision: z.number().int().min(1),
  participantDiscordIds: z.array(z.string().min(1).max(50)).min(1).max(20),
});

const PartyReadyRoomAcknowledgeInvitationSchema = z.object({
  participantDiscordId: z.string().min(1).max(50),
  commandId: z.string().min(1).max(100),
  outcome: z.enum(["SENT", "FAILED"]),
});

const PartyReadyRoomAnnotateInvitationSchema = z.object({
  participantDiscordId: z.string().min(1).max(50),
  expectedRevision: z.number().int().min(1),
  outcome: z.enum(["SENT", "FAILED"]),
});

const PartyReadyRoomReconcileInvitationSchema = z.object({
  participantDiscordId: z.string().min(1).max(50),
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
