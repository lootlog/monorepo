import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { CharacterSchema } from "#src/messaging/dto/shared-character.dto";

const CreatePartyGatheringSchema = z.object({
  guildIds: z.array(z.string().max(50)).min(1).max(10),
  world: z.string().min(1).max(50),
  character: CharacterSchema,
  description: z.string().max(200).optional(),
  minLvl: z.number().min(1).max(500).optional(),
  maxLvl: z.number().min(1).max(500).optional(),
});

export class CreatePartyGatheringDto extends createSchemaClass(
  CreatePartyGatheringSchema,
) {}
