import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const ResolveLootItemParamsSchema = z.object({
  hid: z.string().min(1),
  world: z.string().optional(),
});

export class ResolveLootItemParamsDto extends createSchemaClass(
  ResolveLootItemParamsSchema,
) {}
