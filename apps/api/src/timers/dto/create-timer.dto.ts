import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const NpcSchema = z.object({
  id: z.number(),
  name: z.string(),
  location: z.string(),
  lvl: z.number(),
  prof: z.string().optional(),
  wt: z.number(),
  hpp: z.number().optional(),
  icon: z.string(),
  type: z.number(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const CreateTimerSchema = z.object({
  respBaseSeconds: z.number().min(2),
  respawnRandomness: z.number().optional(),
  world: z.string().min(1),
  npc: NpcSchema,
  characterId: z.string().min(1),
  accountId: z.string().min(1),
});

export class CreateTimerDto extends createZodDto(CreateTimerSchema) {}
