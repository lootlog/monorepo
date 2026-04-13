import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RoutingSchema = z.object({
  tier: z.enum(["base", "titans", "heroes"]),
  npcLevel: z.number().optional(),
});

const DeleteTimerSchema = z.object({
  guildId: z.string(),
  world: z.string(),
  npcId: z.number(),
  routing: RoutingSchema,
});

export class DeleteTimerDto extends createZodDto(DeleteTimerSchema) {}
