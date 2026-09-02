import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const MapItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const CreateMapTemplateSchema = z.object({
  name: z.string(),
  maps: z.array(MapItemSchema).nonempty(),
});

export class CreateMapTemplateDto extends createSchemaClass(
  CreateMapTemplateSchema,
) {}
