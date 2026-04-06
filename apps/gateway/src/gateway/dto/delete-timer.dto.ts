import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const DeleteTimerSchema = z.object({
  guildId: z.string(),
  world: z.string(),
  npcId: z.number(),
});

export class DeleteTimerDto extends createZodDto(DeleteTimerSchema) {}
