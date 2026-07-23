import { describe, expect, it } from "vitest";

import { getReservationSegments } from "./get-reservation-segments";
import type { NormalizedReservation } from "./normalize-reservation";

const createReservation = ({
  id,
  fromDate,
  toDate,
}: {
  id: number;
  fromDate: Date;
  toDate: Date;
}): NormalizedReservation => ({
  id,
  reservationId: `reservation-${id}`,
  createdBy: "user-id",
  comment: null,
  createdDate: new Date(2026, 0, 1, 12, 0),
  fromDate,
  toDate,
});

describe("getReservationSegments", () => {
  it("splits multi-day reservations into visible day segments", () => {
    const weekStart = new Date(2026, 0, 5, 0, 0);
    const segments = getReservationSegments(
      [
        createReservation({
          id: 1,
          fromDate: new Date(2026, 0, 5, 22, 0),
          toDate: new Date(2026, 0, 7, 2, 0),
        }),
      ],
      weekStart,
    );

    expect(
      segments.map((segment) => ({
        dayIdx: segment.dayIdx,
        startHour: segment.startHour,
        durationHours: segment.durationHours,
        isReservationStart: segment.isReservationStart,
      })),
    ).toEqual([
      { dayIdx: 0, startHour: 22, durationHours: 2, isReservationStart: true },
      {
        dayIdx: 1,
        startHour: 0,
        durationHours: 24,
        isReservationStart: false,
      },
      { dayIdx: 2, startHour: 0, durationHours: 2, isReservationStart: false },
    ]);
  });

  it("ignores reservations that do not overlap the selected week", () => {
    const weekStart = new Date(2026, 0, 5, 0, 0);
    const weekEnd = new Date(2026, 0, 12, 0, 0);

    const segments = getReservationSegments(
      [
        createReservation({
          id: 1,
          fromDate: new Date(2026, 0, 4, 20, 0),
          toDate: new Date(weekStart),
        }),
        createReservation({
          id: 2,
          fromDate: new Date(weekEnd),
          toDate: new Date(2026, 0, 12, 2, 0),
        }),
      ],
      weekStart,
    );

    expect(segments).toEqual([]);
  });
});
