import { NotificationTriggerType } from "@lootlog/schema/notifications";
import { afterEach, describe, expect, it, setSystemTime } from "bun:test";
import { createNotificationRuleFixture } from "../../../test/notification-fixtures.js";
import {
  NotificationOwnerType,
  NotificationScheduleIntervalType,
} from "#src/notifications/notification-enums";
import {
  createNotificationRuleValues,
  updateNotificationRuleValues,
} from "#src/notifications/rules/notification-rule-policy";

afterEach(() => setSystemTime());

describe("notification rule policy", () => {
  it("replaces an old one-time start with the next occurrence of a daily schedule", () => {
    setSystemTime(new Date("2026-09-01T08:00:00.000Z"));

    const values = updateNotificationRuleValues(
      NotificationOwnerType.GUILD,
      createNotificationRuleFixture({
        scheduleIntervalType: "ONCE",
        scheduledAt: new Date("2099-09-02T10:00:00.000Z"),
        scheduleTimeOfDay: null,
      }),
      { scheduleIntervalType: "DAILY", scheduleTimeOfDay: "12:30" },
    );

    expect(values.scheduledAt).toEqual(new Date("2026-09-01T10:30:00.000Z"));
    expect(values.scheduleIntervalValue).toBeNull();
  });

  it("reschedules a weekly rule when the visible weekday and time change", () => {
    setSystemTime(new Date("2026-09-01T08:00:00.000Z"));

    const values = updateNotificationRuleValues(
      NotificationOwnerType.GUILD,
      createNotificationRuleFixture({
        scheduleIntervalType: "WEEKLY",
        scheduleWeekday: 3,
        scheduledAt: new Date("2026-09-02T10:00:00.000Z"),
      }),
      { scheduleWeekday: 2, scheduleTimeOfDay: "14:00" },
    );

    expect(values.scheduledAt).toEqual(new Date("2026-09-01T12:00:00.000Z"));
  });

  it("removes recurring limits when changing to a one-time message", () => {
    const values = updateNotificationRuleValues(
      NotificationOwnerType.GUILD,
      createNotificationRuleFixture({
        scheduleIntervalType: "WEEKLY",
        scheduleWeekday: 3,
        scheduledUntil: new Date("2026-09-03T10:00:00.000Z"),
      }),
      {
        scheduleIntervalType: "ONCE",
        scheduledAt: "2099-09-02T10:00:00.000Z",
      },
    );

    expect(values).toMatchObject({
      scheduledAt: new Date("2099-09-02T10:00:00.000Z"),
      scheduledUntil: null,
      scheduleWeekday: null,
      scheduleTimeOfDay: null,
      scheduleIntervalValue: null,
    });
  });

  it("applies the canonical guild timezone to scheduled messages", () => {
    const values = createNotificationRuleValues(
      NotificationOwnerType.GUILD,
      "guild-1",
      {
        triggerType: NotificationTriggerType.SCHEDULED_MESSAGE,
        scheduledAt: "2026-09-02T12:00:00.000Z",
        targetIds: [1],
      },
    );

    expect(values.guildId).toBe("guild-1");
    expect(values.world).toBeNull();
    expect(values.scheduleTimezone).toBe("Europe/Warsaw");
  });

  it("rejects a recurring user schedule without a timezone", () => {
    expect(() =>
      createNotificationRuleValues(NotificationOwnerType.USER, "user-1", {
        triggerType: NotificationTriggerType.SCHEDULED_MESSAGE,
        scheduleIntervalType: NotificationScheduleIntervalType.DAILY,
        scheduleTimeOfDay: "12:00",
        targetIds: [1],
      }),
    ).toThrow();
  });

  it("preserves fields omitted by an update", () => {
    const values = updateNotificationRuleValues(
      NotificationOwnerType.USER,
      {
        triggerType: NotificationTriggerType.WATCHED_ITEM_DROPPED,
        world: "fobos",
        name: "rare loot",
        filters: { itemIds: [10] },
        contentTemplate: "template",
        scheduleStrategy: null,
        scheduleAnchor: null,
        scheduleOffsetMinutes: null,
        scheduledAt: null,
        scheduleIntervalType: null,
        scheduleIntervalValue: null,
        scheduleWeekday: null,
        scheduleTimeOfDay: null,
        scheduledUntil: null,
        scheduleTimezone: null,
        enabled: true,
        dedupeWindowSeconds: 0,
      },
      { enabled: false },
    );

    expect(values).toMatchObject({
      world: "fobos",
      name: "rare loot",
      filters: { itemIds: [10] },
      contentTemplate: "template",
      enabled: false,
    });
  });
});
