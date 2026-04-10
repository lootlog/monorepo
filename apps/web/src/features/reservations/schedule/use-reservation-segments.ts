import type { Reservation } from "@/hooks/api/reservations/use-reservations";
import type { ReservationSegment } from "./types";
import { DAYS, HOURS } from "./constants";

export function useReservationSegments(
  reservations: Reservation[],
  weekStart: Date,
) {
  const weekStartTimestamp = weekStart.getTime();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const reservationsInWeek = reservations.filter(
    (reservation) =>
      reservation.toDate > weekStart && reservation.fromDate < weekEnd,
  );

  const segments: ReservationSegment[] = [];

  reservationsInWeek.forEach((reservation, reservationIndex) => {
    const reservationUniqueId = `${reservationIndex}-${reservation.createdDate.getTime()}-${reservation.fromDate.getTime()}-${reservation.toDate.getTime()}`;

    for (let dayIdx = 0; dayIdx < DAYS.length; dayIdx += 1) {
      const dayStart = new Date(weekStartTimestamp);
      dayStart.setDate(dayStart.getDate() + dayIdx);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      if (reservation.toDate <= dayStart || reservation.fromDate >= dayEnd) {
        continue;
      }

      const segmentStart =
        reservation.fromDate > dayStart
          ? new Date(reservation.fromDate)
          : new Date(dayStart);
      const segmentEnd =
        reservation.toDate < dayEnd
          ? new Date(reservation.toDate)
          : new Date(dayEnd);

      const startHour =
        (segmentStart.getTime() - dayStart.getTime()) / 3_600_000;
      const durationHours =
        (segmentEnd.getTime() - segmentStart.getTime()) / 3_600_000;

      if (durationHours <= 0) {
        continue;
      }

      const clampedStartHour = Math.max(0, Math.min(HOURS.length, startHour));
      const clampedDuration = Math.max(
        0,
        Math.min(HOURS.length - clampedStartHour, durationHours),
      );

      if (clampedDuration <= 0) {
        continue;
      }

      segments.push({
        reservation,
        id: reservationUniqueId,
        dayIdx,
        startHour: clampedStartHour,
        durationHours: clampedDuration,
        segmentStart,
        segmentEnd,
        isReservationStart:
          segmentStart.getTime() === reservation.fromDate.getTime(),
      });
    }
  });

  return segments;
}
