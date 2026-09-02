import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  makeNotificationJobRecurrence,
  type NotificationRecurringRule,
} from "./notification-job-recurrence.js";
import {
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationScheduleIntervalType,
} from "./notification-enums.js";

const recurringRule = {
  id: 7,
  ownerType: NotificationOwnerType.USER,
  ownerId: "user-1",
  enabled: true,
  scheduledAt: new Date("2026-09-02T12:00:00.000Z"),
  scheduleIntervalType: NotificationScheduleIntervalType.DAILY,
  scheduleIntervalValue: 1,
  scheduleWeekday: null,
  scheduleTimeOfDay: "12:00",
  scheduleTimezone: "Europe/Warsaw",
  scheduledUntil: null,
  targets: [],
} as unknown as NotificationRecurringRule;

describe("notification job recurrence", () => {
  it("does not advance while the current cycle still has pending work", async () => {
    let advanced = false;
    const scheduleNext = makeNotificationJobRecurrence(
      {
        findRule: () => Effect.succeed(recurringRule),
        cycleStatuses: () =>
          Effect.succeed([{ status: NotificationJobStatus.PENDING }]),
        advance: () =>
          Effect.sync(() => {
            advanced = true;
            return true;
          }),
      },
      () => Effect.succeed(true),
      { scheduledMessage: () => ({}) },
      {
        create: () => Effect.die("no job should be created"),
        enqueue: () => Effect.die("no job should be enqueued"),
      },
    );

    await Effect.runPromise(scheduleNext(7));

    expect(advanced).toBeFalse();
  });
});
