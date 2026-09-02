import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const ReorderLocationsSchema = z.object({
  locationIds: z.array(z.string()),
});

export class ReorderLocationsDto extends createZodDto(ReorderLocationsSchema) {}
