export const DEFAULT_RESERVATION_SETTINGS = {
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
} as const;

export const RESERVATION_GRANULARITY_OPTIONS = [5, 10, 15, 30, 60] as const;

export type ReservationSettings = {
  reservationMaxDurationMinutes: number;
  reservationMinDurationMinutes: number;
  reservationTimeGranularityMinutes: number;
  reservationMaxAdvanceDays: number;
  reservationActiveLimitPerSpot: number;
};

export const getReservationSettings = (
  guild: Partial<ReservationSettings> | null | undefined,
): ReservationSettings => ({
  reservationMaxDurationMinutes:
    guild?.reservationMaxDurationMinutes ??
    DEFAULT_RESERVATION_SETTINGS.reservationMaxDurationMinutes,
  reservationMinDurationMinutes:
    guild?.reservationMinDurationMinutes ??
    DEFAULT_RESERVATION_SETTINGS.reservationMinDurationMinutes,
  reservationTimeGranularityMinutes:
    guild?.reservationTimeGranularityMinutes ??
    DEFAULT_RESERVATION_SETTINGS.reservationTimeGranularityMinutes,
  reservationMaxAdvanceDays:
    guild?.reservationMaxAdvanceDays ??
    DEFAULT_RESERVATION_SETTINGS.reservationMaxAdvanceDays,
  reservationActiveLimitPerSpot:
    guild?.reservationActiveLimitPerSpot ??
    DEFAULT_RESERVATION_SETTINGS.reservationActiveLimitPerSpot,
});

export const snapMinutesToStep = (minutes: number, stepMinutes: number) =>
  Math.floor(minutes / stepMinutes) * stepMinutes;

export const isDateAlignedToStep = (date: Date, stepMinutes: number) =>
  date.getSeconds() === 0 &&
  date.getMilliseconds() === 0 &&
  date.getMinutes() % stepMinutes === 0;

export const getDurationMinutes = (fromDate: Date, toDate: Date) =>
  Math.round((toDate.getTime() - fromDate.getTime()) / 60_000);
