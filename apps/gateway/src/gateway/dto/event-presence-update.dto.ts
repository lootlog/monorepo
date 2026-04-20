import { z } from "zod";

export const EventPresenceUpdateSchema = z.object({
  mapId: z.number().optional(),
  mapName: z.string().optional(),
  isAfk: z.boolean().optional(),
});

export type EventPresenceUpdateDto = z.infer<typeof EventPresenceUpdateSchema>;
