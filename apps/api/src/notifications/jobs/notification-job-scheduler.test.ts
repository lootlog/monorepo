import { describe, expect, it } from "bun:test";
import {
  NotificationJobKind,
  NotificationOwnerType,
  NotificationTargetType,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";
import {
  notificationJobIdempotencyKey,
  type NotificationJobInput,
} from "#src/notifications/jobs/notification-job-scheduler";

const input = (jobKind: NotificationJobKind): NotificationJobInput => ({
  notificationRule: {
    id: 17,
    ownerType: NotificationOwnerType.GUILD,
    ownerId: "guild-1",
    guildId: "guild-1",
    triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
  },
  target: {
    id: 23,
    externalId: "channel-1",
    targetType: NotificationTargetType.CHANNEL,
    active: true,
    canSend: true,
  },
  jobKind,
  scheduledFor: new Date("2026-09-02T12:00:00.000Z"),
  sourceEntityType: "timer",
  sourceEntityId: "timer-1",
  sourceEventId: "event-1",
  payloadSnapshot: {},
});

describe("notification job scheduler", () => {
  it("preserves the scheduled-job idempotency contract", () => {
    expect(
      notificationJobIdempotencyKey(input(NotificationJobKind.SCHEDULED)),
    ).toBe("scheduled:17:23:timer:timer-1:2026-09-02T12:00:00.000Z");
  });

  it("preserves the test-job idempotency contract", () => {
    expect(notificationJobIdempotencyKey(input(NotificationJobKind.TEST))).toBe(
      "test:17:23:event-1",
    );
  });
});
