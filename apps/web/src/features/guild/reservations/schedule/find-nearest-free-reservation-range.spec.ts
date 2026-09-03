import { describe, expect, it } from "vitest";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import {
  findNearestFreeReservationRange,
  getNearestFreeReservationSearchWindow,
} from "./find-nearest-free-reservation-range";

const settings = {
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
} satisfies ReservationSettings;

const now = new Date(2026, 0, 1, 12, 7, 30, 0);

describe("findNearestFreeReservationRange", () => {
  it("returns the nearest grid-aligned range when the calendar is empty", () => {
    expect(
      findNearestFreeReservationRange({ intervals: [], now, settings }),
    ).toEqual({
      startsAt: new Date(2026, 0, 1, 12, 15),
      endsAt: new Date(2026, 0, 1, 12, 45),
    });
  });

  it("continues after an active reservation and aligns its end to the grid", () => {
    expect(
      findNearestFreeReservationRange({
        intervals: [
          {
            startsAt: new Date(2026, 0, 1, 12, 0),
            endsAt: new Date(2026, 0, 1, 13, 7),
          },
        ],
        now,
        settings,
      }),
    ).toEqual({
      startsAt: new Date(2026, 0, 1, 13, 15),
      endsAt: new Date(2026, 0, 1, 13, 45),
    });
  });

  it("allows a range that ends exactly when another reservation starts", () => {
    expect(
      findNearestFreeReservationRange({
        intervals: [
          {
            startsAt: new Date(2026, 0, 1, 12, 45),
            endsAt: new Date(2026, 0, 1, 13, 15),
          },
        ],
        now,
        settings,
      }),
    ).toEqual({
      startsAt: new Date(2026, 0, 1, 12, 15),
      endsAt: new Date(2026, 0, 1, 12, 45),
    });
  });

  it("skips consecutive and overlapping reservations", () => {
    expect(
      findNearestFreeReservationRange({
        intervals: [
          {
            startsAt: new Date(2026, 0, 1, 12, 45),
            endsAt: new Date(2026, 0, 1, 14, 0),
          },
          {
            startsAt: new Date(2026, 0, 1, 12, 0),
            endsAt: new Date(2026, 0, 1, 13, 0),
          },
        ],
        now,
        settings,
      }),
    ).toEqual({
      startsAt: new Date(2026, 0, 1, 14, 0),
      endsAt: new Date(2026, 0, 1, 14, 30),
    });
  });

  it("returns null when no minimum-duration range fits before the limit", () => {
    expect(
      findNearestFreeReservationRange({
        intervals: [
          {
            startsAt: new Date(2026, 0, 1, 12, 0),
            endsAt: new Date(2026, 0, 2, 12, 30),
          },
        ],
        now: new Date(2026, 0, 1, 12, 0),
        settings: { ...settings, reservationMaxAdvanceDays: 1 },
      }),
    ).toBeNull();
  });

  it("builds a bounded API window covering the latest possible range", () => {
    expect(getNearestFreeReservationSearchWindow({ now, settings })).toEqual({
      from: new Date(2026, 0, 1, 12, 15),
      to: new Date(2026, 0, 8, 12, 30),
    });
  });
});
