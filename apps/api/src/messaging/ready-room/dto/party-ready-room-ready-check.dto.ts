import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartyReadyRoomReadyResponseSchema = z.object({
  participantId: z.string().min(1).max(100),
  roundId: z.number().int().min(1),
  ready: z.boolean(),
});

export class PartyReadyRoomReadyResponseDto extends createZodDto(
  PartyReadyRoomReadyResponseSchema,
) {}
