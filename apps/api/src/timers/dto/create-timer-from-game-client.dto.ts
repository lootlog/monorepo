import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { TIMER_LIMITS } from "src/timers/constants/timer-limits";

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

const CreateTimerFromGameClientSchema = z.object({
  respBaseSeconds: z.number().min(TIMER_LIMITS.MIN_RESP_BASE_SECONDS),
  respawnRandomness: z.number().optional(),
  customMinSpawnTime: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.string().datetime().optional(),
  ),
  customMaxSpawnTime: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.string().datetime().optional(),
  ),
  world: z.string().min(1),
  npc: NpcSchema,
  characterId: z.string().min(1),
  accountId: z.string().min(1),
  character: z
    .object({
      nick: z.string(),
      lvl: z.number(),
      prof: z.string(),
      icon: z.string(),
      clan: z
        .object({
          id: z.number(),
          name: z.string(),
        })
        .nullable(),
    })
    .optional(),
});

export class CreateTimerFromGameClientDto extends createZodDto(
  CreateTimerFromGameClientSchema,
) {}
