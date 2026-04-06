import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const ResetTimerSchema = z.object({
  world: z.string().min(1),
});

export class ResetTimerDto extends createZodDto(ResetTimerSchema) {}
