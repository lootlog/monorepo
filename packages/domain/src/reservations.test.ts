import { describe, expect, it } from "bun:test";
import {
  DEFAULT_RESERVATION_SETTINGS,
  resolveReservationSettings,
  validateReservationTime,
} from "./reservations.js";

describe("Reservation time policy", () => {
  it("resolves missing settings without replacing Organization values", () => {
    expect(
      resolveReservationSettings({
        reservationMinDurationMinutes: 15,
        reservationTimeGranularityMinutes: 5,
      }),
    ).toEqual({
      ...DEFAULT_RESERVATION_SETTINGS,
      reservationMinDurationMinutes: 15,
      reservationTimeGranularityMinutes: 5,
    });
  });

  it("accepts a range aligned to the Organization settings", () => {
    expect(
      validateReservationTime({
        startsAt: new Date("2026-08-26T12:15:00.000Z"),
        endsAt: new Date("2026-08-26T13:15:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings: DEFAULT_RESERVATION_SETTINGS,
      }),
    ).toBeNull();
  });

  it("rejects a start outside the authoritative 60-second grace", () => {
    expect(
      validateReservationTime({
        startsAt: new Date("2026-08-26T11:45:00.000Z"),
        endsAt: new Date("2026-08-26T12:30:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings: DEFAULT_RESERVATION_SETTINGS,
      }),
    ).toEqual({ code: "RESERVATION_START_IN_PAST" });
  });

  it("allows an unchanged past start while editing", () => {
    expect(
      validateReservationTime({
        startsAt: new Date("2026-08-26T11:45:00.000Z"),
        endsAt: new Date("2026-08-26T12:30:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings: DEFAULT_RESERVATION_SETTINGS,
        allowPastStart: true,
      }),
    ).toBeNull();
  });

  it("returns details from the supplied Organization settings", () => {
    expect(
      validateReservationTime({
        startsAt: new Date("2026-08-26T12:15:00.000Z"),
        endsAt: new Date("2026-08-26T12:20:00.000Z"),
        now: new Date("2026-08-26T12:00:00.000Z"),
        settings: {
          ...DEFAULT_RESERVATION_SETTINGS,
          reservationMinDurationMinutes: 15,
        },
      }),
    ).toEqual({
      code: "RESERVATION_TOO_SHORT",
      minimumMinutes: 15,
    });
  });
});
