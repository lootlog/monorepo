import { z } from "zod";

export const RoutingSchema = z.object({
  tier: z.enum(["base", "titans", "heroes"]),
  npcLevel: z.number().optional(),
});

export const DeleteTimerSchema = z.object({
  guildId: z.string(),
  world: z.string(),
  npcId: z.number(),
  routing: RoutingSchema,
});

export type DeleteTimerDto = z.infer<typeof DeleteTimerSchema>;
