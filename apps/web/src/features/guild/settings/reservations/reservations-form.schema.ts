import * as z from "zod";
import { RESERVATION_TIME_GRANULARITY_OPTIONS } from "@lootlog/domain/reservations";

export const reservationsSettingsFormSchema = z
  .object({
    reservationMaxDurationMinutes: z.number().int().min(30).max(720),
    reservationMinDurationMinutes: z.number().int().min(5).max(240),
    reservationTimeGranularityMinutes: z
      .number()
      .int()
      .refine((value) =>
        RESERVATION_TIME_GRANULARITY_OPTIONS.some(
          (granularity) => granularity === value,
        ),
      ),
    reservationMaxAdvanceDays: z.number().int().min(1).max(30),
    reservationActiveLimitPerSpot: z.number().int().min(1).max(10),
  })
  .refine(
    (values) =>
      values.reservationMinDurationMinutes <=
      values.reservationMaxDurationMinutes,
    {
      message: "settings.reservations.validation.minGreaterThanMax",
      path: ["reservationMinDurationMinutes"],
    },
  );

export type ReservationsSettingsFormValues = z.infer<
  typeof reservationsSettingsFormSchema
>;
