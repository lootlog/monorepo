import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CreateMapSchema = z.object({
  mapId: z.number().int(),
  mapName: z.string(),
});

export class CreateMapDto extends createSchemaClass(CreateMapSchema) {}
