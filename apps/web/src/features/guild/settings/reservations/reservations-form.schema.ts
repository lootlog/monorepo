import { Schema } from "effect";
import { RESERVATION_TIME_GRANULARITY_OPTIONS } from "@lootlog/domain/reservations";

const boundedInt = (minimum: number, maximum: number) =>
  Schema.Int.check(
    Schema.isGreaterThanOrEqualTo(minimum),
    Schema.isLessThanOrEqualTo(maximum),
  );

const ReservationsSettingsFormFields = Schema.Struct({
  reservationMaxDurationMinutes: boundedInt(30, 720),
  reservationMinDurationMinutes: boundedInt(5, 240),
  reservationTimeGranularityMinutes: Schema.Int.check(
    Schema.makeFilter((value) =>
      RESERVATION_TIME_GRANULARITY_OPTIONS.some(
        (granularity) => granularity === value,
      ),
    ),
  ),
  reservationMaxAdvanceDays: boundedInt(1, 30),
  reservationActiveLimitPerSpot: boundedInt(1, 10),
});

export const reservationsSettingsFormSchema = Schema.toStandardSchemaV1(
  ReservationsSettingsFormFields.check(
    Schema.makeFilter((values) =>
      values.reservationMinDurationMinutes <=
      values.reservationMaxDurationMinutes
        ? undefined
        : {
            path: ["reservationMinDurationMinutes"],
            issue: "settings.reservations.validation.minGreaterThanMax",
          },
    ),
  ),
);

export type ReservationsSettingsFormValues =
  typeof ReservationsSettingsFormFields.Type;
