import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { CharacterSchema } from "#src/messaging/dto/shared-character.dto";

const CreateVolunteerSchema = z.object({
  world: z.string().min(1).max(50),
  targetDiscordId: z.string().min(1).max(20),
  character: CharacterSchema,
});

export class CreateVolunteerDto extends createSchemaClass(
  CreateVolunteerSchema,
) {}
