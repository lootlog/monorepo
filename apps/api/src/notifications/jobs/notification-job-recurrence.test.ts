import { createNotificationRuleFixture } from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  makeNotificationJobRecurrence,
  type NotificationRecurringRule,
} from "#src/notifications/jobs/notification-job-recurrence";
import { NotificationJobStatus } from "@lootlog/schema/notifications";

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

  it("moves a rule whose cycle was skipped to its next future occurrence", async () => {
    const advanced: Array<{ readonly from: Date; readonly to: Date }> = [];

    const scheduleNext = makeNotificationJobRecurrence(
      {
        findRule: () => Effect.succeed(recurringRule),
        cycleStatuses: () =>
          Effect.succeed([{ status: NotificationJobStatus.CANCELED }]),
        advance: (_ruleId, from, to) =>
          Effect.sync(() => {
            advanced.push({ from, to });

            return true;
          }),
      },
      () => Effect.succeed(true),
      { scheduledMessage: () => ({}) },
      {
        create: () => Effect.succeed(null),
        enqueue: () => Effect.void,
      },
    );

    await Effect.runPromise(scheduleNext(7));

    expect(advanced).toHaveLength(1);
    expect(advanced[0]?.from).toEqual(new Date("2026-09-02T12:00:00.000Z"));
    expect(advanced[0]?.to.getTime()).toBeGreaterThan(Date.now());
  });
});
