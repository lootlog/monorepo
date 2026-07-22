import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const PartyReadyRoomObservationSchema = z.object({
  memberCharacterIds: z.array(z.string().min(1).max(255)).max(20),
  organizerAccountId: z.string().min(1).max(255),
  organizerCharacterId: z.string().min(1).max(255),
});

export class PartyReadyRoomObservationDto extends createZodDto(
  PartyReadyRoomObservationSchema,
) {}
