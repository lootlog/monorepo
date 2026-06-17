import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const GuildResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  vanityUrl: z.string().nullable().optional(),
  ownerId: z.string(),
  publicStatsCardEnabled: z.boolean(),
  reservationMaxDurationMinutes: z.number(),
  reservationMinDurationMinutes: z.number(),
  reservationTimeGranularityMinutes: z.number(),
  reservationMaxAdvanceDays: z.number(),
  reservationActiveLimitPerSpot: z.number(),
});

export class GuildResponseDto extends createZodDto(GuildResponseSchema) {}
