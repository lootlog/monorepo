import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const AssignMapLocationSchema = z.object({
  locationId: z.string().nullable().optional(),
});

export class AssignMapLocationDto extends createZodDto(
  AssignMapLocationSchema,
) {}
