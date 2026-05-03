import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const GuildResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  vanityUrl: z.string().nullable().optional(),
  ownerId: z.string(),
  publicStatsCardEnabled: z.boolean(),
});

export class GuildResponseDto extends createZodDto(GuildResponseSchema) {}
