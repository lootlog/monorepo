import { createNotificationJobFixture } from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import type { DiscordNotificationDeliveryResultEvent } from "@lootlog/schema/notifications";
import { makeNotificationDeliveryResult } from "#src/notifications/delivery/notification-delivery-result";

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
        prune: () => Effect.die("prune should not run for a retry"),
      },
      {
        enqueue: (jobId, delay) =>
          Effect.sync(() => {
            enqueued.push([jobId, delay]);
          }),
      },
      () => Effect.die("recurrence should not run for a retry"),
    );

    await Effect.runPromise(handle(failedEvent));

    expect(records).toHaveLength(1);
    expect(enqueued).toEqual([["job-1", 90_000]]);
  });

  it("finalizes the fourth failed attempt and prunes history", async () => {
    let pruned = false;
    const handle = makeNotificationDeliveryResult(
      {
        find: () => Effect.succeed(job(4)),
        record: () => Effect.void,
        prune: () =>
          Effect.sync(() => {
            pruned = true;
          }),
      },
      { enqueue: () => Effect.die("final failures must not be retried") },
      () => Effect.void,
    );

    await Effect.runPromise(handle(failedEvent));

    expect(pruned).toBeTrue();
  });
});
