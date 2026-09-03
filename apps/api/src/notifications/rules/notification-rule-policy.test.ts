import { describe, expect, it } from "bun:test";
import type {
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
} from "#src/http-api/contracts/notifications/schemas";
import {
  NotificationOwnerType,
  NotificationScheduleIntervalType,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";
import {
  createNotificationRuleValues,
  updateNotificationRuleValues,
} from "#src/notifications/rules/notification-rule-policy";

describe("notification rule policy", () => {
  it("applies the canonical guild timezone to scheduled messages", () => {
    const values = createNotificationRuleValues(
      NotificationOwnerType.GUILD,
      "guild-1",
      {
        triggerType: NotificationTriggerType.SCHEDULED_MESSAGE,
        scheduledAt: "2026-09-02T12:00:00.000Z",
        targetIds: [1],
      } as CreateNotificationRuleDto,
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
      } as CreateNotificationRuleDto),
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
      { enabled: false } as UpdateNotificationRuleDto,
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
