import { describe, expect, it } from "vitest";
import type { ReservationSettings } from "@lootlog/reservations";
import {
  parseReservationWindow,
  validateReservationTime,
} from "./reservation-policy.js";

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

  it("preserves the HTTP error contract for a past start", () => {
    expect(() =>
      validateReservationTime({
        startsAt: new Date("2026-08-26T11:45:00.000Z"),
        endsAt: new Date("2026-08-26T12:30:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings,
      }),
    ).toThrowError(
      expect.objectContaining({
        response: { code: "RESERVATION_START_IN_PAST" },
        status: 422,
      }),
    );
  });

  it("preserves Organization settings in HTTP error details", () => {
    expect(() =>
      validateReservationTime({
        startsAt: new Date("2026-08-26T12:15:00.000Z"),
        endsAt: new Date("2026-08-26T12:20:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings: { ...settings, reservationMinDurationMinutes: 15 },
      }),
    ).toThrowError(
      expect.objectContaining({
        response: {
          code: "RESERVATION_TOO_SHORT",
          minimumMinutes: 15,
        },
        status: 422,
      }),
    );
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
