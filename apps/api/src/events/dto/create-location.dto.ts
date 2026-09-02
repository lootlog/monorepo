import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CreateLocationSchema = z.object({
  name: z.string().min(1).max(50),
});

export class CreateLocationDto extends createSchemaClass(
  CreateLocationSchema,
) {}
