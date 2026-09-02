import { createZodDto } from "nestjs-zod";
import * as z from "zod";

const UserGuildListResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  vanityUrl: z.string().nullable().optional(),
  ownerId: z.string(),
  publicStatsCardEnabled: z.boolean(),
  reservationMaxDurationMinutes: z.number().optional(),
  reservationMinDurationMinutes: z.number().optional(),
  reservationTimeGranularityMinutes: z.number().optional(),
  reservationMaxAdvanceDays: z.number().optional(),
  reservationActiveLimitPerSpot: z.number().optional(),
});

export class UserGuildListResponseDto extends createZodDto(
  UserGuildListResponseSchema,
) {}
