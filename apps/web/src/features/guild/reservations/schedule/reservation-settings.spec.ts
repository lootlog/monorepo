import { describe, expect, it } from "vitest";
import {
  getDurationMinutes,
  getReservationSettings,
  isDateAlignedToStep,
  snapMinutesToStep,
} from "./reservation-settings";

describe("reservation settings helpers", () => {
  it("falls back to default settings when guild config is missing", () => {
    expect(getReservationSettings(undefined)).toEqual({
      reservationMaxDurationMinutes: 180,
      reservationMinDurationMinutes: 30,
      reservationTimeGranularityMinutes: 15,
      reservationMaxAdvanceDays: 7,
      reservationActiveLimitPerSpot: 3,
    });
  });

  it("snaps minutes down to the configured step", () => {
    expect(snapMinutesToStep(37, 15)).toBe(30);
    expect(snapMinutesToStep(59, 5)).toBe(55);
  });

  it("checks whether dates are aligned to a minute step", () => {
    expect(isDateAlignedToStep(new Date("2026-01-01T10:30:00.000Z"), 30)).toBe(
      true,
    );
    expect(isDateAlignedToStep(new Date("2026-01-01T10:15:00.000Z"), 30)).toBe(
      false,
    );
  });

  it("returns duration in minutes", () => {
    expect(
      getDurationMinutes(
        new Date("2026-01-01T10:00:00.000Z"),
        new Date("2026-01-01T11:45:00.000Z"),
      ),
    ).toBe(105);
  });
});
