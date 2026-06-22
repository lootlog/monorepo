import { describe, expect, it } from "vitest";

import type { ReservationSegment } from "./types";
import {
  formatDateWithTime,
  formatSegmentTime,
  getDateOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  getLastISOWeek,
  shouldShowEndDateOnFirstSegment,
} from "./utils";

const createSegment = ({
  isReservationStart,
  reservationEnd,
  segmentStart,
}: {
  isReservationStart: boolean;
  reservationEnd: Date;
  segmentStart: Date;
}): ReservationSegment => ({
  reservation: {
    toDate: reservationEnd,
  } as ReservationSegment["reservation"],
  id: "segment",
  dayIdx: 0,
  startHour: 0,
  durationHours: 1,
  segmentStart,
  segmentEnd: reservationEnd,
  isReservationStart,
});

describe("reservation schedule utils", () => {
  it("formats same-day segment times without a date prefix", () => {
    expect(
      formatSegmentTime(new Date(2026, 0, 5, 9, 5), new Date(2026, 0, 5, 0, 0)),
    ).toBe("09:05");
  });

  it("formats cross-day segment times with a date prefix", () => {
    expect(
      formatSegmentTime(
        new Date(2026, 0, 6, 1, 30),
        new Date(2026, 0, 5, 0, 0),
      ),
    ).toBe("06.01 01:30");
  });

  it("formats dates with their time", () => {
    expect(formatDateWithTime(new Date(2026, 10, 9, 7, 45))).toBe(
      "09.11 07:45",
    );
  });

  it("shows an end date on first segments that end on a later calendar day", () => {
    const segment = createSegment({
      isReservationStart: true,
      segmentStart: new Date(2026, 0, 5, 22, 0),
      reservationEnd: new Date(2026, 0, 6, 1, 0),
    });

    expect(shouldShowEndDateOnFirstSegment(segment)).toBe(true);
  });

  it("does not show an end date for same-day or continuation segments", () => {
    const sameDaySegment = createSegment({
      isReservationStart: true,
      segmentStart: new Date(2026, 0, 5, 9, 0),
      reservationEnd: new Date(2026, 0, 5, 10, 0),
    });
    const continuationSegment = createSegment({
      isReservationStart: false,
      segmentStart: new Date(2026, 0, 6, 0, 0),
      reservationEnd: new Date(2026, 0, 6, 1, 0),
    });

    expect(shouldShowEndDateOnFirstSegment(sameDaySegment)).toBe(false);
    expect(shouldShowEndDateOnFirstSegment(continuationSegment)).toBe(false);
  });

  it("calculates ISO week and year around year boundaries", () => {
    expect(getISOWeek(new Date(2026, 0, 1))).toBe(1);
    expect(getISOWeekYear(new Date(2026, 0, 1))).toBe(2026);
    expect(getISOWeek(new Date(2027, 0, 1))).toBe(53);
    expect(getISOWeekYear(new Date(2027, 0, 1))).toBe(2026);
  });

  it("returns ISO week start dates", () => {
    expect(getDateOfISOWeek(1, 2026)).toEqual(new Date(2025, 11, 29));
    expect(getDateOfISOWeek(53, 2026)).toEqual(new Date(2026, 11, 28));
    expect(getLastISOWeek(2026)).toBe(53);
  });
});
