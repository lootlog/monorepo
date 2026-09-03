import { NotificationScheduleIntervalType } from "#src/notifications/notification-enums";
import {
  calculateFirstOccurrenceInTimeZone,
  calculateNextOccurrenceInTimeZone,
  isRecurringScheduleInterval,
  isValidTimeZone,
} from "#src/notifications/rules/notification-schedule-time";

describe("notification-schedule-time.util", () => {
  const timeZone = "Europe/Warsaw";

  describe("isValidTimeZone", () => {
    it("recognizes supported IANA time zones", () => {
      expect(isValidTimeZone(timeZone)).toBe(true);
    });

    it("rejects invalid time zones", () => {
      expect(isValidTimeZone("Lootlog/Invalid")).toBe(false);
    });
  });

  describe("isRecurringScheduleInterval", () => {
    it("returns true for daily and weekly intervals", () => {
      expect(
        isRecurringScheduleInterval(NotificationScheduleIntervalType.DAILY),
      ).toBe(true);
      expect(
        isRecurringScheduleInterval(NotificationScheduleIntervalType.WEEKLY),
      ).toBe(true);
    });

    it("returns false for one-time and hourly intervals", () => {
      expect(
        isRecurringScheduleInterval(NotificationScheduleIntervalType.ONCE),
      ).toBe(false);
      expect(
        isRecurringScheduleInterval(NotificationScheduleIntervalType.HOURLY),
      ).toBe(false);
    });
  });

  describe("calculateFirstOccurrenceInTimeZone", () => {
    it("uses today's local date when a daily time is still upcoming", () => {
      const scheduledAt = calculateFirstOccurrenceInTimeZone({
        intervalType: NotificationScheduleIntervalType.DAILY,
        timeOfDay: "09:00",
        timeZone,
        now: new Date("2026-01-15T07:30:00.000Z"),
      });

      expect(scheduledAt.toISOString()).toBe("2026-01-15T08:00:00.000Z");
    });

    it("moves daily schedules to tomorrow when today's time has passed", () => {
      const scheduledAt = calculateFirstOccurrenceInTimeZone({
        intervalType: NotificationScheduleIntervalType.DAILY,
        timeOfDay: "08:00",
        timeZone,
        now: new Date("2026-01-15T07:30:00.000Z"),
      });

      expect(scheduledAt.toISOString()).toBe("2026-01-16T07:00:00.000Z");
    });

    it("moves weekly schedules to the requested local weekday", () => {
      const scheduledAt = calculateFirstOccurrenceInTimeZone({
        intervalType: NotificationScheduleIntervalType.WEEKLY,
        timeOfDay: "09:00",
        timeZone,
        weekday: 5,
        now: new Date("2026-01-15T07:30:00.000Z"),
      });

      expect(scheduledAt.toISOString()).toBe("2026-01-16T08:00:00.000Z");
    });

    it("moves weekly schedules by seven days when this week's time has passed", () => {
      const scheduledAt = calculateFirstOccurrenceInTimeZone({
        intervalType: NotificationScheduleIntervalType.WEEKLY,
        timeOfDay: "09:00",
        timeZone,
        weekday: 5,
        now: new Date("2026-01-16T10:00:00.000Z"),
      });

      expect(scheduledAt.toISOString()).toBe("2026-01-23T08:00:00.000Z");
    });
  });

  describe("calculateNextOccurrenceInTimeZone", () => {
    it("adds the configured amount of UTC hours for hourly schedules", () => {
      const scheduledAt = calculateNextOccurrenceInTimeZone({
        currentScheduledAt: new Date("2026-01-15T07:30:00.000Z"),
        intervalType: NotificationScheduleIntervalType.HOURLY,
        intervalValue: 3,
        weekday: null,
        timeOfDay: null,
        timeZone,
      });

      expect(scheduledAt?.toISOString()).toBe("2026-01-15T10:30:00.000Z");
    });

    it("keeps daily schedules anchored to local time across DST", () => {
      const scheduledAt = calculateNextOccurrenceInTimeZone({
        currentScheduledAt: new Date("2026-03-28T08:00:00.000Z"),
        intervalType: NotificationScheduleIntervalType.DAILY,
        intervalValue: null,
        weekday: null,
        timeOfDay: "09:00",
        timeZone,
      });

      expect(scheduledAt?.toISOString()).toBe("2026-03-29T07:00:00.000Z");
    });

    it("keeps weekly schedules anchored to local time", () => {
      const scheduledAt = calculateNextOccurrenceInTimeZone({
        currentScheduledAt: new Date("2026-03-28T08:00:00.000Z"),
        intervalType: NotificationScheduleIntervalType.WEEKLY,
        intervalValue: null,
        weekday: 6,
        timeOfDay: "09:00",
        timeZone,
      });

      expect(scheduledAt?.toISOString()).toBe("2026-04-04T07:00:00.000Z");
    });

    it("returns null when recurring schedules are missing required timing fields", () => {
      expect(
        calculateNextOccurrenceInTimeZone({
          currentScheduledAt: new Date("2026-01-15T07:30:00.000Z"),
          intervalType: NotificationScheduleIntervalType.HOURLY,
          intervalValue: 0,
          weekday: null,
          timeOfDay: null,
          timeZone,
        }),
      ).toBeNull();

      expect(
        calculateNextOccurrenceInTimeZone({
          currentScheduledAt: new Date("2026-01-15T07:30:00.000Z"),
          intervalType: NotificationScheduleIntervalType.WEEKLY,
          intervalValue: null,
          weekday: null,
          timeOfDay: "09:00",
          timeZone,
        }),
      ).toBeNull();
    });
  });
});
