import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RequestPlayerPresenceSchema = z.object({
  guildId: z.string().min(1),
  world: z.string().optional(),
});

export class RequestPlayerPresenceDto extends createZodDto(
  RequestPlayerPresenceSchema,
) {}
