import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  makeNotificationJobDispatch,
  type NotificationDispatchJob,
} from "./notification-job-dispatch.js";
import {
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationTargetType,
} from "./notification-enums.js";

const job = (active: boolean): NotificationDispatchJob =>
  ({
    id: "job-1",
    ownerType: NotificationOwnerType.USER,
    ownerId: "user-1",
    attemptCount: 2,
    payloadSnapshot: { title: "title", message: "message" },
    rule: { guildId: null },
    target: {
      id: 4,
      externalId: "user-1",
      targetType: NotificationTargetType.DM,
      active,
      canSend: true,
      metadata: null,
    },
  }) as unknown as NotificationDispatchJob;

describe("notification job dispatch", () => {
  it("blocks an inactive target before claim and publish", async () => {
    const updates: Array<Record<string, unknown>> = [];
    let claimed = false;
    let published = false;
    const dispatch = makeNotificationJobDispatch(
      {
        find: () => Effect.succeed(job(false)),
        update: (_jobId, values) =>
          Effect.sync(() => {
            updates.push(values);
          }),
        claim: () =>
          Effect.sync(() => {
            claimed = true;
            return true;
          }),
      },
      { hasRequiredGuildPermissions: () => Effect.succeed(true) },
      {
        publish: () =>
          Effect.sync(() => {
            published = true;
          }),
      },
      { enqueue: () => Effect.void },
      () => undefined,
    );

    await Effect.runPromise(dispatch("job-1"));

    expect(updates).toEqual([
      {
        status: NotificationJobStatus.BLOCKED,
        blockedReason: "Notification target is disabled",
        lastError: "Notification target is disabled",
      },
    ]);
    expect(claimed).toBeFalse();
    expect(published).toBeFalse();
  });

  it("returns a claimed job to pending and enqueues the established retry", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const enqueued: Array<[string, number]> = [];
    const dispatch = makeNotificationJobDispatch(
      {
        find: () => Effect.succeed(job(true)),
        update: (_jobId, values) =>
          Effect.sync(() => {
            updates.push(values);
          }),
        claim: () => Effect.succeed(true),
      },
      { hasRequiredGuildPermissions: () => Effect.succeed(true) },
      { publish: () => Effect.fail(new Error("broker unavailable")) },
      {
        enqueue: (jobId, delay) =>
          Effect.sync(() => {
            enqueued.push([jobId, delay]);
          }),
      },
      () => undefined,
    );

    await Effect.runPromise(dispatch("job-1"));

    expect(updates).toEqual([
      {
        status: NotificationJobStatus.PENDING,
        lastError: "AMQP publish failed: broker unavailable",
      },
    ]);
    expect(enqueued).toEqual([["job-1", 30_000]]);
  });
});
