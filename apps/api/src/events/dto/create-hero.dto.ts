import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { HeroMapSchema } from "./create-event.dto.js";

const CreateHeroSchema = z.object({
  npcId: z.number().int().optional(),
  npcName: z.string(),
  maps: z.array(HeroMapSchema).optional(),
});

export class CreateHeroDto extends createSchemaClass(CreateHeroSchema) {}
