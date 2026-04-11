import { describe, expect, it } from "vitest";
import {
  formatDateTimeLocalInputValue,
  formatNotificationDateInTimeZone,
  GUILD_NOTIFICATION_TIMEZONE,
  parseDateTimeLocalInputToIsoString,
} from "@/features/guild/notifications/utils/notification-schedule-time.utils";

describe("notificationScheduleTimeUtils", () => {
  it("round-trips summer datetimes for the guild timezone", () => {
    const isoString = "2026-05-10T10:30:00.000Z";
    const inputValue = formatDateTimeLocalInputValue(
      isoString,
      GUILD_NOTIFICATION_TIMEZONE,
    );

    expect(inputValue).toBe("2026-05-10T12:30");
    expect(
      parseDateTimeLocalInputToIsoString(
        inputValue,
        GUILD_NOTIFICATION_TIMEZONE,
      ),
    ).toBe(isoString);
  });

  it("round-trips winter datetimes for the guild timezone", () => {
    const isoString = "2026-01-10T10:30:00.000Z";
    const inputValue = formatDateTimeLocalInputValue(
      isoString,
      GUILD_NOTIFICATION_TIMEZONE,
    );

    expect(inputValue).toBe("2026-01-10T11:30");
    expect(
      parseDateTimeLocalInputToIsoString(
        inputValue,
        GUILD_NOTIFICATION_TIMEZONE,
      ),
    ).toBe(isoString);
  });

  it("formats scheduled notification dates in the configured timezone", () => {
    expect(
      formatNotificationDateInTimeZone(
        "2026-07-03T19:45:00.000Z",
        GUILD_NOTIFICATION_TIMEZONE,
      ),
    ).toBe("03.07.2026, 21:45");
  });
});
