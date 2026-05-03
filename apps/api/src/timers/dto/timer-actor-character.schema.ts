import { z } from "zod";

export const TimerActorCharacterSchema = z.object({
  accountId: z.string().min(1),
  characterId: z.string().min(1),
  name: z.string().min(1).max(50),
  prof: z.string().optional(),
  icon: z.string().optional(),
  lvl: z.number().int().min(1).optional(),
});
