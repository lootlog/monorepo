import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { RESERVATION_TIME_GRANULARITY_OPTIONS } from "@lootlog/domain/reservations";
import { ErrorKey } from "#src/guilds/enum/error-key.enum";

const UpdateGuildConfigSchema = z.object({
  vanityUrl: z.string().min(1).nullable().optional(),
  publicStatsCardEnabled: z.boolean().optional(),
  reservationMaxDurationMinutes: z.number().int().min(30).max(720).optional(),
  reservationMinDurationMinutes: z.number().int().min(5).max(240).optional(),
  reservationTimeGranularityMinutes: z
    .number()
    .int()
    .refine(
      (value) =>
        RESERVATION_TIME_GRANULARITY_OPTIONS.some(
          (granularity) => granularity === value,
        ),
      {
        message: ErrorKey.GUILDS_RESERVATION_TIME_GRANULARITY_INVALID,
      },
    )
    .optional(),
  reservationMaxAdvanceDays: z.number().int().min(1).max(30).optional(),
  reservationActiveLimitPerSpot: z.number().int().min(1).max(10).optional(),
});

export class UpdateGuildConfigDto extends createSchemaClass(
  UpdateGuildConfigSchema,
) {}
