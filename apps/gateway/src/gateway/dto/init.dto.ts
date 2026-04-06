import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const InitSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    sub: z.string(),
  }),
});

export class InitDto extends createZodDto(InitSchema) {}
