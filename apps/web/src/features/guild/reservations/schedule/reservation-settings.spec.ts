import { describe, expect, it } from "vitest";
import {
  clampReservationEndDate,
  getDurationMinutes,
  isReservationStartSelectable,
  snapMinutesToStep,
  validateReservationDateRange,
} from "./reservation-settings";

describe("reservation settings helpers", () => {
  const settings = {
    reservationMaxDurationMinutes: 180,
    reservationMinDurationMinutes: 30,
    reservationTimeGranularityMinutes: 15,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 3,
  };
  const now = new Date(2026, 0, 1, 12, 0, 0, 0);

  it("snaps minutes down to the configured step", () => {
    expect(snapMinutesToStep(37, 15)).toBe(30);
    expect(snapMinutesToStep(59, 5)).toBe(55);
  });

  it("returns duration in minutes", () => {
    expect(
      getDurationMinutes(
        new Date("2026-01-01T10:00:00.000Z"),
        new Date("2026-01-01T11:45:00.000Z"),
      ),
    ).toBe(105);
  });

  it("accepts a valid reservation date range", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 12, 30),
        toDate: new Date(2026, 0, 1, 14, 0),
        settings,
        now,
      }),
    ).toBeNull();
  });

  it("rejects a reservation shorter than the configured minimum", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 12, 30),
        toDate: new Date(2026, 0, 1, 12, 45),
        settings,
        now,
      }),
    ).toBe("minimumDuration");
  });

  it("rejects a reservation longer than the configured maximum", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 12, 30),
        toDate: new Date(2026, 0, 1, 16, 0),
        settings,
        now,
      }),
    ).toBe("maximumDuration");
  });

  it("rejects a reservation starting too far in the future", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 9, 12, 15),
        toDate: new Date(2026, 0, 9, 13, 0),
        settings,
        now,
      }),
    ).toBe("maxAdvance");
  });

  it("rejects dates outside the configured grid step", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 12, 33),
        toDate: new Date(2026, 0, 1, 13, 33),
        settings,
        now,
      }),
    ).toBe("invalidTimeGrid");
  });

  it("rejects a reservation starting before the past tolerance", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 10, 45),
        toDate: new Date(2026, 0, 1, 11, 30),
        settings,
        now,
      }),
    ).toBe("startTooOld");
  });

  it("matches the authoritative 60-second grace for a past start", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 11, 45),
        toDate: new Date(2026, 0, 1, 12, 30),
        settings,
        now,
      }),
    ).toBe("startTooOld");
  });

  it("allows an unchanged past start while editing an active reservation", () => {
    expect(
      validateReservationDateRange({
        fromDate: new Date(2026, 0, 1, 10, 45),
        toDate: new Date(2026, 0, 1, 13, 0),
        settings,
        now,
        allowPastStart: true,
      }),
    ).toBeNull();
  });

  it("does not allow opening the form for a grid selection in the past", () => {
    expect(
      isReservationStartSelectable(new Date(2026, 0, 1, 11, 59), now),
    ).toBe(false);
    expect(isReservationStartSelectable(now, now)).toBe(true);
  });

  it("clamps dragged range to the configured maximum duration", () => {
    expect(
      clampReservationEndDate({
        anchorDate: new Date(2026, 0, 1, 12, 0),
        targetDate: new Date(2026, 0, 1, 18, 0),
        settings,
        now,
      }),
    ).toEqual(new Date(2026, 0, 1, 14, 45));
  });

  it("clamps dragged range to the configured maximum advance window", () => {
    expect(
      clampReservationEndDate({
        anchorDate: new Date(2026, 0, 8, 10, 0),
        targetDate: new Date(2026, 0, 8, 13, 0),
        settings: {
          ...settings,
          reservationMaxAdvanceDays: 7,
          reservationMaxDurationMinutes: 720,
        },
        now,
      }),
    ).toEqual(new Date(2026, 0, 8, 12, 0));
  });
});
