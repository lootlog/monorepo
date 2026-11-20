import { MARGONEM_TIME_ZONE } from "@lootlog/datetime";
import { describe, expect, it } from "vitest";
import {
  formatDateTimeLocalInputValue,
  formatNotificationDateInTimeZone,
  parseDateTimeLocalInputToIsoString,
} from "@/features/guild/notifications/utils/notification-schedule-time.utils";

describe("notificationScheduleTimeUtils", () => {
  it("round-trips summer datetimes for the guild timezone", () => {
    const isoString = "2026-05-10T10:30:00.000Z";

    const inputValue = formatDateTimeLocalInputValue(
      isoString,
      MARGONEM_TIME_ZONE,
    );

    expect(inputValue).toBe("2026-05-10T12:30");
    expect(
      parseDateTimeLocalInputToIsoString(inputValue, MARGONEM_TIME_ZONE),
    ).toBe(isoString);
  });

  it("round-trips winter datetimes for the guild timezone", () => {
    const isoString = "2026-01-10T10:30:00.000Z";

    const inputValue = formatDateTimeLocalInputValue(
      isoString,
      MARGONEM_TIME_ZONE,
    );

    expect(inputValue).toBe("2026-01-10T11:30");
    expect(
      parseDateTimeLocalInputToIsoString(inputValue, MARGONEM_TIME_ZONE),
    ).toBe(isoString);
  });

  it("formats scheduled notification dates in the configured timezone", () => {
    expect(
      formatNotificationDateInTimeZone(
        "2026-07-03T19:45:00.000Z",
        MARGONEM_TIME_ZONE,
      ),
    ).toBe("03.07.2026, 21:45");
  });
});
