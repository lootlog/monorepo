import {
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";

export type ReservationSettings = {
  reservationMaxDurationMinutes: number;
  reservationMinDurationMinutes: number;
  reservationTimeGranularityMinutes: number;
  reservationMaxAdvanceDays: number;
  reservationActiveLimitPerSpot: number;
};

const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const START_GRACE_MS = 60 * 1000;

export function parseReservationWindow(fromValue: string, toValue: string) {
  const from = new Date(fromValue);
  const to = new Date(toValue);
  const durationMs = to.getTime() - from.getTime();

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    durationMs <= 0
  ) {
    throw new BadRequestException({ code: "INVALID_TIME_RANGE" });
  }
  if (durationMs > MAX_WINDOW_MS) {
    throw new BadRequestException({ code: "RESERVATION_WINDOW_TOO_LARGE" });
  }

  return { from, to };
}

export function validateReservationTime(options: {
  startsAt: Date;
  endsAt: Date;
  settings: ReservationSettings;
  now?: Date;
  allowPastStart?: boolean;
}): void {
  const now = options.now ?? new Date();
  const durationMinutes =
    (options.endsAt.getTime() - options.startsAt.getTime()) / 60_000;

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new UnprocessableEntityException({ code: "INVALID_TIME_RANGE" });
  }
  if (
    !options.allowPastStart &&
    options.startsAt.getTime() < now.getTime() - START_GRACE_MS
  ) {
    throw new UnprocessableEntityException({
      code: "RESERVATION_START_IN_PAST",
    });
  }
  if (durationMinutes < options.settings.reservationMinDurationMinutes) {
    throw new UnprocessableEntityException({
      code: "RESERVATION_TOO_SHORT",
      minimumMinutes: options.settings.reservationMinDurationMinutes,
    });
  }
  if (durationMinutes > options.settings.reservationMaxDurationMinutes) {
    throw new UnprocessableEntityException({
      code: "RESERVATION_TOO_LONG",
      maximumMinutes: options.settings.reservationMaxDurationMinutes,
    });
  }
  if (
    options.startsAt.getTime() >
    now.getTime() +
      options.settings.reservationMaxAdvanceDays * 24 * 60 * 60 * 1000
  ) {
    throw new UnprocessableEntityException({
      code: "RESERVATION_TOO_FAR_IN_ADVANCE",
      maximumDays: options.settings.reservationMaxAdvanceDays,
    });
  }
  if (
    !isAlignedToGrid(
      options.startsAt,
      options.settings.reservationTimeGranularityMinutes,
    ) ||
    !isAlignedToGrid(
      options.endsAt,
      options.settings.reservationTimeGranularityMinutes,
    )
  ) {
    throw new UnprocessableEntityException({
      code: "INVALID_TIME_GRID",
      granularityMinutes: options.settings.reservationTimeGranularityMinutes,
    });
  }
}

function isAlignedToGrid(date: Date, granularityMinutes: number): boolean {
  return (
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    date.getUTCMinutes() % granularityMinutes === 0
  );
}
