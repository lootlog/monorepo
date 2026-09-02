import { createZodDto } from "nestjs-zod";
import * as z from "zod";
import { CharacterSchema } from "#src/messaging/dto/shared-character.dto";

const PartyReadyRoomApplicationSchema = z.object({
  world: z.string().min(1).max(50),
  character: CharacterSchema,
});

export class PartyReadyRoomApplicationDto extends createZodDto(
  PartyReadyRoomApplicationSchema,
) {}
