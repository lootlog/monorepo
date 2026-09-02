import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateHeroSchema = z.object({
  npcName: z.string(),
  npcId: z.number().optional(),
});

export class UpdateHeroDto extends createSchemaClass(UpdateHeroSchema) {}
