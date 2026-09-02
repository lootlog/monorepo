import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export class UpdateLocationDto extends createSchemaClass(
  UpdateLocationSchema,
) {}
