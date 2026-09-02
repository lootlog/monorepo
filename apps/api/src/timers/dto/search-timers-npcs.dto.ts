import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const SearchTimersNpcsSchema = z.object({
  search: z.string().min(1),
  world: z.string().min(1),
  limit: z.coerce.number().min(1).max(50).default(10).optional(),
});

export class SearchTimersNpcsDto extends createSchemaClass(
  SearchTimersNpcsSchema,
) {}
