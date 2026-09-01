export type ReservationSettings = {
  reservationMaxDurationMinutes: number;
  reservationMinDurationMinutes: number;
  reservationTimeGranularityMinutes: number;
  reservationMaxAdvanceDays: number;
  reservationActiveLimitPerSpot: number;
};

export const DEFAULT_RESERVATION_SETTINGS = {
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
} as const satisfies ReservationSettings;

export const RESERVATION_TIME_GRANULARITY_OPTIONS = [
  5, 10, 15, 30, 60,
] as const;

export const RESERVATION_START_GRACE_MS = 60_000;

export type ReservationTimeValidationIssue =
  | { code: "INVALID_TIME_RANGE" }
  | { code: "RESERVATION_START_IN_PAST" }
  | { code: "RESERVATION_TOO_SHORT"; minimumMinutes: number }
  | { code: "RESERVATION_TOO_LONG"; maximumMinutes: number }
  | { code: "RESERVATION_TOO_FAR_IN_ADVANCE"; maximumDays: number }
  | { code: "INVALID_TIME_GRID"; granularityMinutes: number };

type ValidateReservationTimeOptions = {
  startsAt: Date;
  endsAt: Date;
  settings: ReservationSettings;
  now?: Date;
  allowPastStart?: boolean;
};

export function resolveReservationSettings(
  settings: Partial<ReservationSettings> | null | undefined,
): ReservationSettings {
  return {
    reservationMaxDurationMinutes:
      settings?.reservationMaxDurationMinutes ??
      DEFAULT_RESERVATION_SETTINGS.reservationMaxDurationMinutes,
    reservationMinDurationMinutes:
      settings?.reservationMinDurationMinutes ??
      DEFAULT_RESERVATION_SETTINGS.reservationMinDurationMinutes,
    reservationTimeGranularityMinutes:
      settings?.reservationTimeGranularityMinutes ??
      DEFAULT_RESERVATION_SETTINGS.reservationTimeGranularityMinutes,
    reservationMaxAdvanceDays:
      settings?.reservationMaxAdvanceDays ??
      DEFAULT_RESERVATION_SETTINGS.reservationMaxAdvanceDays,
    reservationActiveLimitPerSpot:
      settings?.reservationActiveLimitPerSpot ??
      DEFAULT_RESERVATION_SETTINGS.reservationActiveLimitPerSpot,
  };
}

export function validateReservationTime({
  startsAt,
  endsAt,
  settings,
  now = new Date(),
  allowPastStart = false,
}: ValidateReservationTimeOptions): ReservationTimeValidationIssue | null {
  const durationMinutes = (endsAt.getTime() - startsAt.getTime()) / 60_000;

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { code: "INVALID_TIME_RANGE" };
  }
  if (
    !allowPastStart &&
    startsAt.getTime() < now.getTime() - RESERVATION_START_GRACE_MS
  ) {
    return { code: "RESERVATION_START_IN_PAST" };
  }
  if (durationMinutes < settings.reservationMinDurationMinutes) {
    return {
      code: "RESERVATION_TOO_SHORT",
      minimumMinutes: settings.reservationMinDurationMinutes,
    };
  }
  if (durationMinutes > settings.reservationMaxDurationMinutes) {
    return {
      code: "RESERVATION_TOO_LONG",
      maximumMinutes: settings.reservationMaxDurationMinutes,
    };
  }
  if (
    startsAt.getTime() >
    now.getTime() + settings.reservationMaxAdvanceDays * 24 * 60 * 60 * 1000
  ) {
    return {
      code: "RESERVATION_TOO_FAR_IN_ADVANCE",
      maximumDays: settings.reservationMaxAdvanceDays,
    };
  }
  if (
    !isAlignedToGrid(startsAt, settings.reservationTimeGranularityMinutes) ||
    !isAlignedToGrid(endsAt, settings.reservationTimeGranularityMinutes)
  ) {
    return {
      code: "INVALID_TIME_GRID",
      granularityMinutes: settings.reservationTimeGranularityMinutes,
    };
  }

  return null;
}

function isAlignedToGrid(date: Date, granularityMinutes: number): boolean {
  return (
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    date.getUTCMinutes() % granularityMinutes === 0
  );
}
