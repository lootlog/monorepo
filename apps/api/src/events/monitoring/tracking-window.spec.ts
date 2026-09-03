import {
  calculateTrackingDurationSeconds,
  clipIntervalToWindow,
  getTrackingWindowDurationSeconds,
  getTrackingWindowStartTime,
} from "#src/events/monitoring/tracking-window";

describe("tracking-window.util", () => {
  describe("clipIntervalToWindow", () => {
    it("should clip interval to the requested window", () => {
      const result = clipIntervalToWindow({
        start: new Date("2026-03-12T10:00:00.000Z"),
        end: new Date("2026-03-12T11:00:00.000Z"),
        windowStart: new Date("2026-03-12T10:15:00.000Z"),
        windowEnd: new Date("2026-03-12T10:45:00.000Z"),
      });

      expect(result).toEqual({
        start: new Date("2026-03-12T10:15:00.000Z"),
        end: new Date("2026-03-12T10:45:00.000Z"),
      });
    });

    it("should return null when there is no overlap", () => {
      const result = clipIntervalToWindow({
        start: new Date("2026-03-12T10:00:00.000Z"),
        end: new Date("2026-03-12T10:10:00.000Z"),
        windowStart: new Date("2026-03-12T10:15:00.000Z"),
        windowEnd: new Date("2026-03-12T10:45:00.000Z"),
      });

      expect(result).toBeNull();
    });
  });

  describe("calculateTrackingDurationSeconds", () => {
    it("should merge overlapping intervals before summing duration", () => {
      const result = calculateTrackingDurationSeconds([
        {
          start: new Date("2026-03-12T10:00:00.000Z"),
          end: new Date("2026-03-12T10:10:00.000Z"),
        },
        {
          start: new Date("2026-03-12T10:05:00.000Z"),
          end: new Date("2026-03-12T10:20:00.000Z"),
        },
        {
          start: new Date("2026-03-12T10:30:00.000Z"),
          end: new Date("2026-03-12T10:35:00.000Z"),
        },
      ]);

      expect(result).toBe(1500);
    });
  });

  describe("tracking window timing", () => {
    it("should clamp tracking window start to kill time when spawn time is later", () => {
      const killedAt = new Date("2026-03-12T10:00:00.000Z");
      const minSpawnTimeAtKill = new Date("2026-03-12T10:05:00.000Z");

      expect(
        getTrackingWindowStartTime({
          killedAt,
          minSpawnTimeAtKill,
        }),
      ).toEqual(killedAt);
      expect(
        getTrackingWindowDurationSeconds({
          killedAt,
          minSpawnTimeAtKill,
        }),
      ).toBe(0);
    });
  });
});
