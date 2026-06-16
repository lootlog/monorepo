import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RequestOnlinePlayersPresenceSchema = z.object({
  guildId: z.string().min(1),
  world: z.string().min(1),
});

export class RequestOnlinePlayersPresenceDto extends createZodDto(
  RequestOnlinePlayersPresenceSchema,
) {}
