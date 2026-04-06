import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateLocationSchema = z.object({
  name: z.string().min(1).max(50),
});

export class CreateLocationDto extends createZodDto(CreateLocationSchema) {}
