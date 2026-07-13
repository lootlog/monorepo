import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const ExpectedRevisionSchema = z.object({
  expectedRevision: z.number().int().min(1),
});

const PartyReadyRoomParticipantActionSchema = ExpectedRevisionSchema.extend({
  participantDiscordId: z.string().min(1).max(50),
});

export class PartyReadyRoomExpectedRevisionDto extends createZodDto(
  ExpectedRevisionSchema,
) {}

export class PartyReadyRoomParticipantActionDto extends createZodDto(
  PartyReadyRoomParticipantActionSchema,
) {}
