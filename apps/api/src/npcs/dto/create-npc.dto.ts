import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CreateNpcSchema = z.object({
  id: z.number(),
  prof: z.string(),
  icon: z.string(),
  name: z.string(),
  lvl: z.number(),
  wt: z.number(),
  type: z.string(),
  margonemType: z.number(),
  world: z.string(),
});

export class CreateNpcDto extends createSchemaClass(CreateNpcSchema) {}
