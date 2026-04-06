import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RequestServerPresenceSchema = z.object({
  guildId: z.string().min(1),
  world: z.string().min(1),
});

export class RequestServerPresenceDto extends createZodDto(
  RequestServerPresenceSchema,
) {}
