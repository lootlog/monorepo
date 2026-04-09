import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const OpenRespawnWindowSchema = z.object({
  minSpawnTime: z.string().min(1).datetime(),
  maxSpawnTime: z.string().min(1).datetime(),
});

export class OpenRespawnWindowDto extends createZodDto(
  OpenRespawnWindowSchema,
) {}
