import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const KillNpcSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  lvl: z.number(),
  prof: z.string().optional(),
  wt: z.number(),
  icon: z.string().optional(),
});

export class KillNpcDto extends createZodDto(KillNpcSchema) {}

const CreateKillSchema = z.object({
  world: z.string().min(1),
  npc: KillNpcSchema,
  characterId: z.string().min(1),
  accountId: z.string().min(1),
});

export class CreateKillDto extends createZodDto(CreateKillSchema) {}
