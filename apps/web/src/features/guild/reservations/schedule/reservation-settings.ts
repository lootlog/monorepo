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

export type ReservationRangeValidationError =
  | "timeRangeRequired"
  | "endAfterStart"
  | "startTooOld"
  | "minimumDuration"
  | "maximumDuration"
  | "maxAdvance";

type ReservationRangeValidationOptions = {
  fromDate: Date | undefined;
  toDate: Date | undefined;
  settings: ReservationSettings;
  now?: Date;
};

type ClampReservationEndDateOptions = {
  anchorDate: Date;
  targetDate: Date;
  settings: ReservationSettings;
  now?: Date;
};

const START_PAST_TOLERANCE_MS = 60 * 60 * 1000;

const alignDateToStep = (
  date: Date,
  stepMinutes: number,
  direction: "ceil" | "floor",
) => {
  const alignedDate = new Date(date);
  const totalMinutes = alignedDate.getHours() * 60 + alignedDate.getMinutes();
  const hasSubMinutePart =
    alignedDate.getSeconds() > 0 || alignedDate.getMilliseconds() > 0;
  const remainder = totalMinutes % stepMinutes;
  const shouldRoundUp =
    direction === "ceil" && (remainder > 0 || hasSubMinutePart);
  const nextTotalMinutes = shouldRoundUp
    ? totalMinutes + stepMinutes - remainder
    : totalMinutes - remainder;

  alignedDate.setHours(0, nextTotalMinutes, 0, 0);

  return alignedDate;
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

export const getDurationMinutes = (fromDate: Date, toDate: Date) =>
  Math.round((toDate.getTime() - fromDate.getTime()) / 60_000);

export const getReservationEarliestStartDate = (now = new Date()) =>
  new Date(now.getTime() - START_PAST_TOLERANCE_MS);

export const getReservationLatestStartDate = (
  settings: ReservationSettings,
  now = new Date(),
) =>
  new Date(
    now.getTime() + settings.reservationMaxAdvanceDays * 24 * 60 * 60 * 1000,
  );

export const ceilDateToReservationStep = (
  date: Date,
  settings: ReservationSettings,
) => alignDateToStep(date, settings.reservationTimeGranularityMinutes, "ceil");

export const floorDateToReservationStep = (
  date: Date,
  settings: ReservationSettings,
) => alignDateToStep(date, settings.reservationTimeGranularityMinutes, "floor");

export const validateReservationDateRange = ({
  fromDate,
  toDate,
  settings,
  now = new Date(),
}: ReservationRangeValidationOptions): ReservationRangeValidationError | null => {
  if (!fromDate || !toDate) {
    return "timeRangeRequired";
  }

  if (fromDate >= toDate) {
    return "endAfterStart";
  }

  if (fromDate < getReservationEarliestStartDate(now)) {
    return "startTooOld";
  }

  const durationMinutes = getDurationMinutes(fromDate, toDate);

  if (durationMinutes < settings.reservationMinDurationMinutes) {
    return "minimumDuration";
  }

  if (durationMinutes > settings.reservationMaxDurationMinutes) {
    return "maximumDuration";
  }

  if (fromDate > getReservationLatestStartDate(settings, now)) {
    return "maxAdvance";
  }

  return null;
};

export const clampReservationEndDate = ({
  anchorDate,
  targetDate,
  settings,
  now = new Date(),
}: ClampReservationEndDateOptions) => {
  const granularityMs = settings.reservationTimeGranularityMinutes * 60 * 1000;
  const isForward = targetDate >= anchorDate;

  if (isForward) {
    const maxEndDate = new Date(
      anchorDate.getTime() + settings.reservationMaxDurationMinutes * 60_000,
    );
    const maxDurationTargetDate = alignDateToStep(
      new Date(maxEndDate.getTime() - granularityMs),
      settings.reservationTimeGranularityMinutes,
      "floor",
    );
    const latestStartDate = alignDateToStep(
      getReservationLatestStartDate(settings, now),
      settings.reservationTimeGranularityMinutes,
      "floor",
    );
    const maxTargetDate =
      latestStartDate < maxDurationTargetDate
        ? latestStartDate
        : maxDurationTargetDate;

    if (maxTargetDate < anchorDate) {
      return anchorDate;
    }

    return targetDate > maxTargetDate ? maxTargetDate : targetDate;
  }

  const earliestStartDate = getReservationEarliestStartDate(now);
  const latestStartDate = getReservationLatestStartDate(settings, now);
  const minStartDate = new Date(
    anchorDate.getTime() +
      granularityMs -
      settings.reservationMaxDurationMinutes * 60_000,
  );
  const lowerBound =
    minStartDate > earliestStartDate ? minStartDate : earliestStartDate;
  const upperBound =
    latestStartDate < anchorDate ? latestStartDate : anchorDate;
  const alignedLowerBound = alignDateToStep(
    lowerBound,
    settings.reservationTimeGranularityMinutes,
    "ceil",
  );
  const alignedUpperBound = alignDateToStep(
    upperBound,
    settings.reservationTimeGranularityMinutes,
    "floor",
  );

  if (alignedLowerBound > alignedUpperBound) {
    return alignedUpperBound;
  }

  if (targetDate < alignedLowerBound) {
    return alignedLowerBound;
  }

  if (targetDate > alignedUpperBound) {
    return alignedUpperBound;
  }

  return targetDate;
};
