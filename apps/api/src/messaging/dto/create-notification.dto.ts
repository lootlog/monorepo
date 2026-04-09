import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const NpcSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  location: z.string().min(1),
  lvl: z.number(),
  prof: z.string().optional(),
  wt: z.number(),
  hpp: z.number().optional(),
  icon: z.string().min(1),
  type: z.number(),
});

const CreateNotificationSchema = z.object({
  message: z.string().max(500).optional(),
  npc: NpcSchema.optional(),
  guildIds: z.array(z.string().max(50)).min(1).max(10),
  world: z.string().min(1).max(50),
  isGatheringParty: z.boolean().optional(),
});

export class CreateNotificationDto extends createZodDto(
  CreateNotificationSchema,
) {}
