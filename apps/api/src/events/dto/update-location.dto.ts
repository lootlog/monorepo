import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateLocationSchema = z.object({
  name: z.string().min(1).max(50).optional(),
});

export class UpdateLocationDto extends createZodDto(UpdateLocationSchema) {}
