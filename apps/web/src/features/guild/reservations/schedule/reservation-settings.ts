import {
  RESERVATION_START_GRACE_MS,
  validateReservationTime,
  type ReservationSettings,
  type ReservationTimeValidationIssue,
} from "@lootlog/domain/reservations";

export type ReservationRangeValidationError =
  | "timeRangeRequired"
  | "endAfterStart"
  | "invalidTimeGrid"
  | "startTooOld"
  | "minimumDuration"
  | "maximumDuration"
  | "maxAdvance";

type ReservationRangeValidationOptions = {
  fromDate: Date | undefined;
  toDate: Date | undefined;
  settings: ReservationSettings;
  now?: Date;
  allowPastStart?: boolean;
};

type ClampReservationEndDateOptions = {
  anchorDate: Date;
  targetDate: Date;
  settings: ReservationSettings;
  now?: Date;
};

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

export const snapMinutesToStep = (minutes: number, stepMinutes: number) =>
  Math.floor(minutes / stepMinutes) * stepMinutes;

export const getDurationMinutes = (fromDate: Date, toDate: Date) =>
  Math.round((toDate.getTime() - fromDate.getTime()) / 60_000);

export const getReservationEarliestStartDate = (now = new Date()) =>
  new Date(now.getTime() - RESERVATION_START_GRACE_MS);

export const isReservationStartSelectable = (
  startsAt: Date,
  now = new Date(),
) => startsAt >= now;

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
  allowPastStart = false,
}: ReservationRangeValidationOptions): ReservationRangeValidationError | null => {
  if (!fromDate || !toDate) {
    return "timeRangeRequired";
  }

  const issue = validateReservationTime({
    startsAt: fromDate,
    endsAt: toDate,
    settings,
    now,
    allowPastStart,
  });

  return issue ? toReservationRangeValidationError(issue) : null;
};

const toReservationRangeValidationError = (
  issue: ReservationTimeValidationIssue,
): ReservationRangeValidationError => {
  switch (issue.code) {
    case "INVALID_TIME_RANGE":
      return "endAfterStart";
    case "INVALID_TIME_GRID":
      return "invalidTimeGrid";
    case "RESERVATION_START_IN_PAST":
      return "startTooOld";
    case "RESERVATION_TOO_SHORT":
      return "minimumDuration";
    case "RESERVATION_TOO_LONG":
      return "maximumDuration";
    case "RESERVATION_TOO_FAR_IN_ADVANCE":
      return "maxAdvance";
  }
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
