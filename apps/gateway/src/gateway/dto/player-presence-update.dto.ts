import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const PlayerPresenceUpdateSchema = z.object({
  mapId: z.number().optional(),
  mapName: z.string().optional(),
  isAfk: z.boolean().optional(),
});

export class PlayerPresenceUpdateDto extends createZodDto(
  PlayerPresenceUpdateSchema,
) {}
