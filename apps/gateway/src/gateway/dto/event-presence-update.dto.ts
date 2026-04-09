import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const EventPresenceUpdateSchema = z.object({
  mapId: z.number().optional(),
  mapName: z.string().optional(),
  isAfk: z.boolean().optional(),
});

export class EventPresenceUpdateDto extends createZodDto(
  EventPresenceUpdateSchema,
) {}
