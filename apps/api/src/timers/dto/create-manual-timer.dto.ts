import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateManualTimerSchema = z.object({
  name: z.string().min(1).max(50),
  minSeconds: z.number().min(1).optional(),
  maxSeconds: z.number().min(1).optional(),
  customMinSpawnTime: z.string().datetime().optional(),
  customMaxSpawnTime: z.string().datetime().optional(),
  world: z.string().min(1),
});

export class CreateManualTimerDto extends createZodDto(
  CreateManualTimerSchema,
) {}
