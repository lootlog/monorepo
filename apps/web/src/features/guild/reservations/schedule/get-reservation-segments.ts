import { DAYS, HOURS } from "./constants";
import type { NormalizedReservation } from "./normalize-reservation";
import type { ReservationSegment } from "./types";

const assignOverlapLanes = (
  daySegments: ReservationSegment[],
): ReservationSegment[] => {
  const sorted = [...daySegments].sort(
    (left, right) =>
      left.segmentStart.getTime() - right.segmentStart.getTime() ||
      left.segmentEnd.getTime() - right.segmentEnd.getTime(),
  );
  const result: ReservationSegment[] = [];
  let groupStart = 0;

  while (groupStart < sorted.length) {
    let groupEnd = groupStart + 1;
    let latestEnd = sorted[groupStart]?.segmentEnd.getTime() ?? 0;
    while (
      groupEnd < sorted.length &&
      (sorted[groupEnd]?.segmentStart.getTime() ?? 0) < latestEnd
    ) {
      latestEnd = Math.max(
        latestEnd,
        sorted[groupEnd]?.segmentEnd.getTime() ?? latestEnd,
      );
      groupEnd += 1;
    }

    const group = sorted.slice(groupStart, groupEnd);
    const laneEnds: number[] = [];
    const withLanes = group.map((segment) => {
      const start = segment.segmentStart.getTime();
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = segment.segmentEnd.getTime();
      return { ...segment, lane };
    });
    const laneCount = Math.max(1, laneEnds.length);
    result.push(...withLanes.map((segment) => ({ ...segment, laneCount })));
    groupStart = groupEnd;
  }

  return result;
};

export function getReservationSegments(
  reservations: NormalizedReservation[],
  weekStart: Date,
  overscanDays = 0,
) {
  const visibleStart = new Date(weekStart);
  visibleStart.setDate(visibleStart.getDate() - overscanDays);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + DAYS.length + overscanDays);

  const segments: ReservationSegment[] = [];
  for (const reservation of reservations) {
    if (reservation.endsAt <= visibleStart || reservation.startsAt >= weekEnd) {
      continue;
    }

    for (
      let dayIdx = 0 - overscanDays;
      dayIdx < DAYS.length + overscanDays;
      dayIdx += 1
    ) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(dayStart.getDate() + dayIdx);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      if (reservation.endsAt <= dayStart || reservation.startsAt >= dayEnd) {
        continue;
      }

      const segmentStart =
        reservation.startsAt > dayStart
          ? new Date(reservation.startsAt)
          : dayStart;
      const segmentEnd =
        reservation.endsAt < dayEnd ? new Date(reservation.endsAt) : dayEnd;
      const startHour =
        (segmentStart.getTime() - dayStart.getTime()) / 3_600_000;
      const durationHours =
        (segmentEnd.getTime() - segmentStart.getTime()) / 3_600_000;
      if (durationHours <= 0) continue;

      segments.push({
        reservation,
        id: `${reservation.id}:${dayIdx}`,
        dayIdx,
        startHour: Math.max(0, Math.min(HOURS.length, startHour)),
        durationHours: Math.max(
          0,
          Math.min(HOURS.length - startHour, durationHours),
        ),
        segmentStart,
        segmentEnd,
        isReservationStart:
          segmentStart.getTime() === reservation.startsAt.getTime(),
        lane: 0,
        laneCount: 1,
      });
    }
  }

  return Array.from(
    { length: DAYS.length + overscanDays * 2 },
    (_, index) => index - overscanDays,
  ).flatMap((dayIdx) =>
    assignOverlapLanes(segments.filter((segment) => segment.dayIdx === dayIdx)),
  );
}
