import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateLootSchema = z.object({
  msg: z.string(),
});

export class UpdateLootDto extends createSchemaClass(UpdateLootSchema) {}
