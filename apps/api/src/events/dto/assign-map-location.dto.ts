import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const AssignMapLocationSchema = z.object({
  locationId: z.string().nullable().optional(),
});

export class AssignMapLocationDto extends createSchemaClass(
  AssignMapLocationSchema,
) {}
