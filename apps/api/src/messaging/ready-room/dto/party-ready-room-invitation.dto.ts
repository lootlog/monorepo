import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartyReadyRoomReserveInvitationsSchema = z.object({
  expectedRevision: z.number().int().positive(),
  participantDiscordIds: z.array(z.string().min(1).max(50)).min(1).max(20),
});

const PartyReadyRoomAcknowledgeInvitationSchema = z.object({
  participantDiscordId: z.string().min(1).max(50),
  commandId: z.string().min(1).max(100),
  outcome: z.enum(["SENT", "FAILED"]),
});

export class PartyReadyRoomReserveInvitationsDto extends createZodDto(
  PartyReadyRoomReserveInvitationsSchema,
) {}

export class PartyReadyRoomAcknowledgeInvitationDto extends createZodDto(
  PartyReadyRoomAcknowledgeInvitationSchema,
) {}
