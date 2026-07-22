import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartyReadyRoomResolveInvitationTargetsSchema = z.object({
  participantIds: z.array(z.string().min(1).max(100)).min(1).max(100),
});

export class PartyReadyRoomResolveInvitationTargetsDto extends createZodDto(
  PartyReadyRoomResolveInvitationTargetsSchema,
) {}
