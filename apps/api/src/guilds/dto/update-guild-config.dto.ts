import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateGuildConfigSchema = z.object({
  vanityUrl: z.string().min(1).nullable().optional(),
  publicStatsCardEnabled: z.boolean().optional(),
  reservationMaxDurationMinutes: z.number().int().min(30).max(720).optional(),
  reservationMinDurationMinutes: z.number().int().min(5).max(240).optional(),
  reservationTimeGranularityMinutes: z
    .number()
    .int()
    .refine((value) => [5, 10, 15, 30, 60].includes(value), {
      message: "Nieprawidłowy krok siatki rezerwacji.",
    })
    .optional(),
  reservationMaxAdvanceDays: z.number().int().min(1).max(30).optional(),
  reservationActiveLimitPerSpot: z.number().int().min(1).max(10).optional(),
});

export class UpdateGuildConfigDto extends createZodDto(
  UpdateGuildConfigSchema,
) {}
