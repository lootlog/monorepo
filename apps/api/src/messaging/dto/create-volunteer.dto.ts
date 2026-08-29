import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { CharacterSchema } from "#src/messaging/dto/shared-character.dto";

const CreateVolunteerSchema = z.object({
  world: z.string().min(1).max(50),
  targetDiscordId: z.string().min(1).max(20),
  character: CharacterSchema,
});

export class CreateVolunteerDto extends createZodDto(CreateVolunteerSchema) {}
