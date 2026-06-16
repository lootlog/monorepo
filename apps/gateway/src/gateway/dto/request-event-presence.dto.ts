import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const RequestEventPresenceSchema = z.object({
  guildId: z.string().min(1),
  world: z.string().optional(),
});

export class RequestEventPresenceDto extends createZodDto(
  RequestEventPresenceSchema,
) {}
