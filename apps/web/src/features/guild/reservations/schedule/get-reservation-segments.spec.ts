import { describe, expect, it } from "vitest";
import { getReservationSegments } from "./get-reservation-segments";
import type { NormalizedReservation } from "./normalize-reservation";

const createReservation = (
  id: number,
  startsAt: Date,
  endsAt: Date,
  organization = "Lootlog",
): NormalizedReservation => ({
  id,
  spotId: "spot",
  spotName: "Expowisko",
  startsAt,
  endsAt,
  createdAt: new Date(2026, 0, 1, 12),
  comment: null,
  author: { displayName: `Gracz ${id}`, avatarUrl: null },
  sourceOrganization: {
    name: organization,
    iconUrl: null,
    isCurrent: organization === "Lootlog",
    calendarPath: "/lootlog/reservations/spot",
  },
  isMine: id === 1,
  canEdit: id === 1,
  canCancel: id === 1,
  editingConstraints: {
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
  },
  reminderMinutesBefore: null,
});

describe("getReservationSegments", () => {
  it("splits multi-day reservations into visible day segments", () => {
    const weekStart = new Date(2026, 0, 5);
    const segments = getReservationSegments(
      [createReservation(1, new Date(2026, 0, 5, 22), new Date(2026, 0, 7, 2))],
      weekStart,
    );

    expect(
      segments.map(
        ({ dayIdx, startHour, durationHours, isReservationStart }) => ({
          dayIdx,
          startHour,
          durationHours,
          isReservationStart,
        }),
      ),
    ).toEqual([
      { dayIdx: 0, startHour: 22, durationHours: 2, isReservationStart: true },
      { dayIdx: 1, startHour: 0, durationHours: 24, isReservationStart: false },
      { dayIdx: 2, startHour: 0, durationHours: 2, isReservationStart: false },
    ]);
  });

  it("assigns parallel lanes to overlapping partner reservations", () => {
    const weekStart = new Date(2026, 0, 5);
    const segments = getReservationSegments(
      [
        createReservation(
          1,
          new Date(2026, 0, 5, 10),
          new Date(2026, 0, 5, 12),
        ),
        createReservation(
          2,
          new Date(2026, 0, 5, 10, 30),
          new Date(2026, 0, 5, 11, 30),
          "Partner",
        ),
      ],
      weekStart,
    );

    expect(
      segments.map(({ lane, laneCount }) => ({ lane, laneCount })),
    ).toEqual([
      { lane: 0, laneCount: 2 },
      { lane: 1, laneCount: 2 },
    ]);
  });

  it("ignores reservations outside the selected week", () => {
    const weekStart = new Date(2026, 0, 5);
    expect(
      getReservationSegments(
        [createReservation(1, new Date(2026, 0, 4, 20), new Date(2026, 0, 5))],
        weekStart,
      ),
    ).toEqual([]);
  });

  it("includes adjacent days when the calendar requests swipe previews", () => {
    const weekStart = new Date(2026, 0, 5);
    const segments = getReservationSegments(
      [
        createReservation(
          1,
          new Date(2026, 0, 4, 20),
          new Date(2026, 0, 4, 21),
        ),
        createReservation(
          2,
          new Date(2026, 0, 12, 8),
          new Date(2026, 0, 12, 9),
        ),
      ],
      weekStart,
      1,
    );

    expect(segments.map(({ dayIdx }) => dayIdx)).toEqual([-1, 7]);
  });
});
