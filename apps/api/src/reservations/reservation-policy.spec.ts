import { describe, expect, it } from "vitest";
import {
  parseReservationWindow,
  validateReservationTime,
  type ReservationSettings,
} from "./reservation-policy";

const settings: ReservationSettings = {
  reservationMaxDurationMinutes: 180,
  reservationMinDurationMinutes: 30,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 3,
};

describe("reservation policy", () => {
  it("accepts an aligned reservation", () => {
    expect(() =>
      validateReservationTime({
        startsAt: new Date("2026-08-26T12:15:00.000Z"),
        endsAt: new Date("2026-08-26T13:15:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings,
      }),
    ).not.toThrow();
  });

  it("rejects times outside the configured grid", () => {
    expect(() =>
      validateReservationTime({
        startsAt: new Date("2026-08-26T12:10:00.000Z"),
        endsAt: new Date("2026-08-26T13:10:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings,
      }),
    ).toThrowError(expect.objectContaining({ status: 422 }));
  });

  it("limits a calendar query to 31 days", () => {
    expect(() =>
      parseReservationWindow(
        "2026-08-01T00:00:00.000Z",
        "2026-09-02T00:00:00.000Z",
      ),
    ).toThrowError(expect.objectContaining({ status: 400 }));
  });
});
