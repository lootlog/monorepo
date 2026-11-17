import { createNotificationJobFixture } from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { DiscordNotificationDeliveryResultEvent } from "@lootlog/schema/notifications";
import { makeNotificationDeliveryResult } from "#src/notifications/delivery/notification-delivery-result";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import type { NotificationDeliveryUpdate } from "#src/notifications/jobs/notification-job.repository";

const job = (attemptCount: number) =>
  createNotificationJobFixture({ attemptCount });

const keepTarget = () => Effect.die("the target must not be removed");

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
      keepTarget,
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
      keepTarget,
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
      keepTarget,
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
      keepTarget,
    );

    await Effect.runPromise(handle(failedEvent));

    expect(pruned).toBeTrue();
    expect(recorded[0]?.job.status).toBe("FAILED");
    expect(scheduledRuleIds).toEqual([scheduledJob.ruleId]);
  });

  it("removes a guild channel target once Discord reports the channel is gone", async () => {
    const guildJob = createNotificationJobFixture({
      ownerType: "GUILD",
      ownerId: "guild-1",
    });

    const removed: Array<[string, number]> = [];

    const handle = makeNotificationDeliveryResult(
      { find: () => Effect.succeed(guildJob), record: () => Effect.void },
      { enqueue: () => Effect.die("permanent failures must not be retried") },
      () => Effect.void,
      (guildId, targetId) =>
        Effect.sync(() => {
          removed.push([guildId, targetId]);
        }),
    );

    const permanentFailure = { ...failedEvent, retryable: false };

    // Missing permissions can be granted back; the target has to survive.
    await Effect.runPromise(
      handle({ ...permanentFailure, errorCode: "50013" }),
    );
    expect(removed).toEqual([]);

    await Effect.runPromise(
      handle({ ...permanentFailure, errorCode: "10003" }),
    );
    expect(removed).toEqual([["guild-1", guildJob.targetId]]);
  });

  it("resumes the target removal when a recorded failure is redelivered", async () => {
    const failedJob = createNotificationJobFixture({
      ownerType: "GUILD",
      ownerId: "guild-1",
      status: "FAILED",
    });

    const removed: Array<[string, number]> = [];

    const handle = makeNotificationDeliveryResult(
      {
        find: () => Effect.succeed(failedJob),
        record: () => Effect.die("a terminal job must not be recorded again"),
      },
      { enqueue: () => Effect.die("terminal jobs must not be retried") },
      () => Effect.die("a terminal job must not be finalized again"),
      (guildId, targetId) =>
        Effect.sync(() => {
          removed.push([guildId, targetId]);
        }),
    );

    await Effect.runPromise(
      handle({ ...failedEvent, retryable: false, errorCode: "10003" }),
    );

    expect(removed).toEqual([["guild-1", failedJob.targetId]]);
  });
});
