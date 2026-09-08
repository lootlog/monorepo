import { createNotificationRuleFixture } from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  makeNotificationJobRecurrence,
  type NotificationRecurringRule,
} from "#src/notifications/jobs/notification-job-recurrence";
import { NotificationJobStatus } from "#src/notifications/notification-enums";

const recurringRule: NotificationRecurringRule = {
  ...createNotificationRuleFixture(),
  targets: [],
};

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
