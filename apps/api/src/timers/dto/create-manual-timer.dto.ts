import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { NpcType } from "src/generated/prisma/client";

const CreateManualTimerSchema = z.object({
  name: z.string().min(1).max(50),
  minSeconds: z.number().min(1).optional(),
  maxSeconds: z.number().min(1).optional(),
  lvl: z.number().optional(),
  prof: z.string().optional(),
  type: z
    .enum([NpcType.ELITE2, NpcType.ELITE3, NpcType.HERO, NpcType.TITAN])
    .optional(),
  customMinSpawnTime: z.string().datetime().optional(),
  customMaxSpawnTime: z.string().datetime().optional(),
  world: z.string().min(1),
});

export class CreateManualTimerDto extends createZodDto(
  CreateManualTimerSchema,
) {}
