import { createNotificationJobFixture } from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { DiscordNotificationDeliveryResultEvent } from "@lootlog/schema/notifications";
import { makeNotificationDeliveryResult } from "#src/notifications/delivery/notification-delivery-result";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import type { NotificationDeliveryUpdate } from "#src/notifications/jobs/notification-job-store";

const job = (attemptCount: number) =>
  createNotificationJobFixture({ attemptCount });

const failedEvent: DiscordNotificationDeliveryResultEvent = {
  notificationJobId: "job-1",
  success: false,
  retryable: true,
  deliveredAt: "2026-09-02T12:00:00.000Z",
  errorMessage: "temporary failure",
};

describe("notification delivery result", () => {
  it("records a delayed confirmed delivery after publishing exhausted its retries", async () => {
    let storedJob = createNotificationJobFixture({
      status: "FAILED",
      lastError: "AMQP publish failed: channel closed",
    });

    let finalizations = 0;

    const handle = makeNotificationDeliveryResult(
      {
        find: () => Effect.succeed(storedJob),
        record: (update) =>
          Effect.sync(() => {
            storedJob = { ...storedJob, ...update.job };
          }),
      },
      { enqueue: () => Effect.die("terminal jobs must not be retried") },
      () =>
        Effect.sync(() => {
          finalizations += 1;
        }),
    );

    const successEvent: DiscordNotificationDeliveryResultEvent = {
      notificationJobId: storedJob.id,
      success: true,
      retryable: false,
      providerMessageId: "discord-message-1",
      deliveredAt: "2026-09-02T12:00:00.000Z",
    };

    await Effect.runPromise(handle(failedEvent));
    await Effect.runPromise(handle(successEvent));
    await Effect.runPromise(handle(failedEvent));
    await Effect.runPromise(handle(successEvent));

    expect(storedJob.status).toBe("SENT");
    expect(storedJob.providerMessageId).toBe("discord-message-1");
    expect(storedJob.lastError).toBeNull();
    expect(finalizations).toBe(1);
  });

  it("keeps canceled jobs canceled when delayed delivery results arrive", async () => {
    const canceledJob = createNotificationJobFixture({ status: "CANCELED" });

    const handle = makeNotificationDeliveryResult(
      {
        find: () => Effect.succeed(canceledJob),
        record: () =>
          Effect.die("delivery results must not reopen cancellation"),
      },
      { enqueue: () => Effect.die("canceled jobs must not be retried") },
      () => Effect.die("canceled jobs must not be finalized again"),
    );

    await Effect.runPromise(handle(failedEvent));
    await Effect.runPromise(
      handle({ ...failedEvent, success: true, retryable: false }),
    );
  });

  it("requeues retryable delivery failures through attempt three", async () => {
    const records: unknown[] = [];
    const enqueued: Array<[string, number]> = [];

    const handle = makeNotificationDeliveryResult(
      {
        find: () => Effect.succeed(job(3)),
        record: (options) =>
          Effect.sync(() => {
            records.push(options);
          }),
      },
      {
        enqueue: (jobId, delay) =>
          Effect.sync(() => {
            enqueued.push([jobId, delay]);
          }),
      },
      () => Effect.die("finalization should not run for a retry"),
    );

    await Effect.runPromise(handle(failedEvent));

    expect(records).toHaveLength(1);
    expect(enqueued).toEqual([["job-1", 90_000]]);
  });

  it("finalizes the fourth failed attempt and advances the recurring rule", async () => {
    let pruned = false;
    const scheduledRuleIds: number[] = [];
    const recorded: NotificationDeliveryUpdate[] = [];

    const scheduledJob = createNotificationJobFixture({
      attemptCount: 4,
      sourceEntityType: "scheduled-message",
    });

    const handle = makeNotificationDeliveryResult(
      {
        find: () => Effect.succeed(scheduledJob),
        record: (update) =>
          Effect.sync(() => {
            recorded.push(update);
          }),
      },
      { enqueue: () => Effect.die("final failures must not be retried") },
      makeNotificationJobFinalization(
        () =>
          Effect.sync(() => {
            pruned = true;
          }),
        (ruleId) =>
          Effect.sync(() => {
            scheduledRuleIds.push(ruleId);
          }),
      ),
    );

    await Effect.runPromise(handle(failedEvent));

    expect(pruned).toBeTrue();
    expect(recorded[0]?.job.status).toBe("FAILED");
    expect(scheduledRuleIds).toEqual([scheduledJob.ruleId]);
  });
});
