import { z } from "zod";

export const NpcSchema = z.object({
  id: z.number(),
  name: z.string(),
  lvl: z.number(),
  x: z.number(),
  y: z.number(),
  prof: z.string(),
  type: z.string(),
  margonemType: z.string(),
  location: z.string(),
  wt: z.string(),
  icon: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lootId: z.number().nullable(),
});

export const SendNotificationSchema = z.object({
  guildId: z.string(),
  npc: NpcSchema,
  isGatheringParty: z.boolean().optional(),
});

export type SendNotificationDto = z.infer<typeof SendNotificationSchema>;
