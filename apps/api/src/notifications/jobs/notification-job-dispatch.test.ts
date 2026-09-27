import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  makeNotificationJobDispatch,
  type NotificationDispatchJob,
  type NotificationDispatchStore,
} from "#src/notifications/jobs/notification-job-dispatch";
import { NotificationJobStatus } from "#src/notifications/notification-enums";

const job = (active: boolean): NotificationDispatchJob => ({
  ...createNotificationJobFixture({
    attemptCount: 2,
    status: "PENDING",
    payloadSnapshot: { title: "title", message: "message" },
    targetId: 4,
  }),
  rule: createNotificationRuleFixture(),
  target: createNotificationTargetFixture({ id: 4, active }),
});

describe("notification job dispatch", () => {
  it("blocks an inactive target before claim and publish", async () => {
    const updates: Array<Parameters<NotificationDispatchStore["update"]>[1]> =
      [];

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
        failClaim: () => Effect.die("blocked jobs cannot fail a claim"),
      },
      { hasRequiredGuildPermissions: () => Effect.succeed(true) },
      {
        publish: () =>
          Effect.sync(() => {
            published = true;
          }),
      },
      () => Effect.void,
      () => undefined,
    );

    await Effect.runPromise(
      dispatch("job-1", { retrying: false, finalAttempt: false }),
    );

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

  it("keeps a delivered job final when a queued retry finds its target disabled", async () => {
    const dispatch = makeNotificationJobDispatch(
      {
        find: () => Effect.succeed({ ...job(false), status: "SENT" }),
        update: () => Effect.die("delivery must remain final"),
        claim: () => Effect.die("delivered jobs cannot be claimed again"),
        failClaim: () => Effect.die("delivered jobs cannot fail"),
      },
      { hasRequiredGuildPermissions: () => Effect.succeed(true) },
      {
        publish: () => Effect.die("delivered jobs must not be published again"),
      },
      () => Effect.void,
      () => undefined,
    );

    await Effect.runPromise(
      dispatch("job-1", { retrying: true, finalAttempt: false }),
    );
  });
});
