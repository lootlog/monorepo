import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const ReorderLocationsSchema = z.object({
  locationIds: z.array(z.string()),
});

export class ReorderLocationsDto extends createSchemaClass(
  ReorderLocationsSchema,
) {}
