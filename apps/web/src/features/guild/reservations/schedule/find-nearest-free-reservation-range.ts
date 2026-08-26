import {
  ceilDateToReservationStep,
  floorDateToReservationStep,
  getReservationLatestStartDate,
  type ReservationSettings,
} from "./reservation-settings";
import type { ReservationRange } from "./types";

type ReservationInterval = Pick<ReservationRange, "startsAt" | "endsAt">;

type NearestFreeReservationOptions = {
  intervals: ReservationInterval[];
  now: Date;
  settings: ReservationSettings;
};

type NearestFreeReservationSearchWindowOptions = Omit<
  NearestFreeReservationOptions,
  "intervals"
>;

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60_000);

export function getNearestFreeReservationSearchWindow({
  now,
  settings,
}: NearestFreeReservationSearchWindowOptions) {
  const from = ceilDateToReservationStep(now, settings);
  const latestStartsAt = floorDateToReservationStep(
    getReservationLatestStartDate(settings, now),
    settings,
  );

  return {
    from,
    to: addMinutes(latestStartsAt, settings.reservationMinDurationMinutes),
  };
}

export function findNearestFreeReservationRange({
  intervals,
  now,
  settings,
}: NearestFreeReservationOptions): ReservationRange | null {
  const searchWindow = getNearestFreeReservationSearchWindow({ now, settings });
  const durationMinutes = settings.reservationMinDurationMinutes;
  const latestStartsAt = addMinutes(searchWindow.to, -durationMinutes);
  let candidateStartsAt = searchWindow.from;

  const sortedIntervals = intervals
    .slice()
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  for (const interval of sortedIntervals) {
    if (interval.endsAt <= candidateStartsAt) continue;

    const candidateEndsAt = addMinutes(candidateStartsAt, durationMinutes);
    if (interval.startsAt >= candidateEndsAt) {
      return { startsAt: candidateStartsAt, endsAt: candidateEndsAt };
    }

    candidateStartsAt = ceilDateToReservationStep(interval.endsAt, settings);
    if (candidateStartsAt > latestStartsAt) return null;
  }

  if (candidateStartsAt > latestStartsAt) return null;

  return {
    startsAt: candidateStartsAt,
    endsAt: addMinutes(candidateStartsAt, durationMinutes),
  };
}
