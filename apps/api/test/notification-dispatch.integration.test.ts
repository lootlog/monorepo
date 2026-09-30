import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { type JobsOptions, Queue, QueueEvents, Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { Effect, ManagedRuntime, Redacted } from "effect";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import type { DiscordNotificationSendCommand } from "@lootlog/schema/notifications";
import { ApiDatabase, ApiDatabaseLive } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import {
  makeNotificationDispatchProcessor,
  type NotificationDispatchJobData,
} from "#src/notifications/delivery/notifications-dispatch.processor";
import { makeNotificationDeliveryResult } from "#src/notifications/delivery/notification-delivery-result";
import { NOTIFICATION_DISPATCH_JOB_OPTIONS } from "#src/notifications/jobs/dispatch-queue";
import { makeNotificationJobDispatch } from "#src/notifications/jobs/notification-job-dispatch";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job-store";
import { redisUrl } from "#src/runtime/infrastructure/api-redis";
import { applicationLogger } from "#src/shared/application-logger";
import { canDispatchLootNotification } from "#src/notifications/notification-loot-source-visibility";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

describe("notification dispatch with BullMQ and PostgreSQL", () => {
  const runtime = ManagedRuntime.make(ApiDatabaseLive);
  let database: typeof ApiDatabase.Service;
  let redis: StartedTestContainer;

  beforeAll(async () => {
    requireIsolatedTestDatabase();
    database = await runtime.runPromise(ApiDatabase);
    redis = await new GenericContainer("redis:7.4-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
  }, 60_000);

  afterAll(async () => {
    await runtime.dispose();
    await redis?.stop();
  });

  const exerciseDispatch = async (
    scenario:
      | "transient-failure"
      | "permanent-failure"
      | "reset-failure"
      | "legacy-queued-job"
      | "delivery-failure-before-confirm-failure"
      | "delivered-before-confirm-failure",
  ) => {
    const ownerId = crypto.randomUUID();
    const notificationJobId = crypto.randomUUID();
    const oldNotificationJobId = crypto.randomUUID();
    const now = new Date();

    const { ruleId, targetId } = await runtime.runPromise(
      Effect.gen(function* () {
        const [target] = yield* database
          .insert(notificationTargetTable)
          .values({
            ownerType: "USER",
            ownerId,
            provider: "DISCORD",
            targetType: "DM",
            externalId: ownerId,
            updatedAt: now,
          })
          .returning({ id: notificationTargetTable.id });

        const [rule] = yield* database
          .insert(notificationRuleTable)
          .values({
            ownerType: "USER",
            ownerId,
            triggerType: "SCHEDULED_MESSAGE",
            updatedAt: now,
          })
          .returning({ id: notificationRuleTable.id });

        if (!target || !rule) {
          return yield* Effect.die("Notification fixture was not inserted");
        }

        yield* database.insert(notificationJobTable).values({
          id: notificationJobId,
          ruleId: rule.id,
          targetId: target.id,
          ownerType: "USER",
          ownerId,
          jobKind: "INSTANT",
          scheduledFor: now,
          idempotencyKey: notificationJobId,
          payloadSnapshot: { title: "Raid", message: "Ready" },
          updatedAt: now,
        });
        yield* database.insert(notificationJobTable).values({
          id: oldNotificationJobId,
          ruleId: rule.id,
          targetId: target.id,
          ownerType: "USER",
          ownerId,
          jobKind: "INSTANT",
          scheduledFor: new Date(0),
          idempotencyKey: oldNotificationJobId,
          payloadSnapshot: {},
          status: "SENT",
          processedAt: new Date(0),
          updatedAt: new Date(0),
        });

        return { ruleId: rule.id, targetId: target.id };
      }),
    );

    const connection = {
      url: redisUrl({
        username: "",
        password: Redacted.make(""),
        host: redis.getHost(),
        port: redis.getMappedPort(6379),
      }),
    };

    const queueName = `notification-dispatch-${crypto.randomUUID()}`;

    const queue = new Queue<NotificationDispatchJobData>(queueName, {
      connection,
      prefix: "{bull}",
    });

    const events = new QueueEvents(queueName, {
      connection,
      prefix: "{bull}",
    });

    const jobOptions: JobsOptions = {
      ...NOTIFICATION_DISPATCH_JOB_OPTIONS,
      backoff: { ...NOTIFICATION_DISPATCH_JOB_OPTIONS.backoff, delay: 1 },
    };

    if (scenario === "legacy-queued-job") delete jobOptions.attempts;

    const scheduler = makeNotificationJobScheduler(database, {
      add: (jobId, delay) =>
        Effect.tryPromise(() =>
          queue.add(
            jobId,
            { notificationJobId: jobId },
            {
              ...jobOptions,
              jobId,
              delay,
            },
          ),
        ).pipe(Effect.asVoid),
      remove: (jobId) =>
        Effect.tryPromise(async () => {
          await (await queue.getJob(jobId))?.remove();
        }),
    });

    const store = makeNotificationJobStore(database);

    const finalize = makeNotificationJobFinalization(
      ({ ownerType, ownerId: finalizedOwnerId }) =>
        store.prune(
          ownerType,
          finalizedOwnerId,
          ["SENT", "FAILED", "CANCELED"],
          1,
        ),
      () => Effect.void,
    );

    const delivery = makeNotificationDeliveryResult(
      { find: store.findJob, record: store.recordDelivery },
      scheduler,
      finalize,
    );

    let publishAttempts = 0;
    let resetFailed = false;
    const published: DiscordNotificationSendCommand[] = [];

    const dispatch = makeNotificationJobDispatch(
      {
        find: store.findJobWithRelations,
        update: store.updateJob,
        claim: store.claimJob,
        failClaim: (...args) => {
          if (scenario === "reset-failure" && !resetFailed) {
            resetFailed = true;

            return Effect.fail(new Error("database unavailable"));
          }

          return store.failClaim(...args);
        },
        block: store.blockJob,
      },
      {
        hasRequiredGuildPermissions: () => Effect.succeed(true),
        canReadLootSource: (jobId, discordId) =>
          canDispatchLootNotification(database, jobId, discordId),
      },
      {
        publish: Effect.fnUntraced(function* (
          payload: DiscordNotificationSendCommand,
        ) {
          publishAttempts += 1;

          if (
            scenario === "delivery-failure-before-confirm-failure" &&
            publishAttempts === 1
          ) {
            yield* delivery({
              notificationJobId: payload.notificationJobId,
              success: false,
              retryable: true,
              errorMessage: "Discord temporarily unavailable",
              deliveredAt: new Date().toISOString(),
            });
          }

          if (
            scenario !== "delivered-before-confirm-failure" &&
            (scenario === "permanent-failure" || publishAttempts === 1)
          ) {
            return yield* Effect.fail(new Error("broker unavailable"));
          }

          published.push(payload);
          yield* delivery({
            notificationJobId: payload.notificationJobId,
            success: true,
            retryable: false,
            providerMessageId: "discord-message-1",
            deliveredAt: new Date().toISOString(),
          });

          if (scenario === "delivered-before-confirm-failure") {
            return yield* Effect.fail(new Error("broker unavailable"));
          }
        }),
      },
      finalize,
      () => undefined,
    );

    const processor = makeNotificationDispatchProcessor(
      { dispatch },
      applicationLogger,
    );

    const worker = new Worker<NotificationDispatchJobData>(
      queueName,
      (job) => runtime.runPromise(processor(job)),
      { connection, prefix: "{bull}", autorun: false },
    );

    try {
      await Promise.all([events.waitUntilReady(), worker.waitUntilReady()]);
      await runtime.runPromise(scheduler.enqueue(notificationJobId, 0));
      const queued = await queue.getJob(notificationJobId);

      if (!queued) throw new Error("Notification was not queued");

      let receivedFailure = false;
      events.on("failed", ({ jobId }) => {
        if (jobId === notificationJobId) receivedFailure = true;
      });

      const completion = queued.waitUntilFinished(events, 5_000).then(
        () => "completed",
        (cause: unknown) => {
          if (!receivedFailure) throw cause;

          return "failed";
        },
      );

      void worker.run();
      const outcome = await completion;

      const notification = await runtime.runPromise(
        store.findJob(notificationJobId),
      );

      const oldNotification = await runtime.runPromise(
        store.findJob(oldNotificationJobId),
      );

      const remaining = await queue.getJob(notificationJobId);

      return {
        outcome,
        notification,
        oldNotification,
        publishAttempts,
        published,
        remaining,
      };
    } finally {
      await worker.close();
      await events.close();
      await queue.obliterate({ force: true });
      await queue.close();
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* database
            .delete(notificationRuleTable)
            .where(eq(notificationRuleTable.id, ruleId));
          yield* database
            .delete(notificationTargetTable)
            .where(eq(notificationTargetTable.id, targetId));
        }),
      );
    }
  };

  it("retries an AMQP failure on the same active job and publishes once after recovery", async () => {
    const result = await exerciseDispatch("transient-failure");

    expect(result.outcome).toBe("completed");
    expect(result.notification).toMatchObject({
      status: "SENT",
      attemptCount: 2,
      providerMessageId: "discord-message-1",
      lastError: null,
    });
    expect(result.publishAttempts).toBe(2);
    expect(result.published).toHaveLength(1);
    expect(result.published[0]?.notificationJobId).toBe(
      result.notification?.id,
    );
    expect(result.remaining).toBeUndefined();
  }, 15_000);

  it("exhausts publication retries without leaving a pending notification orphan", async () => {
    const result = await exerciseDispatch("permanent-failure");

    expect(result.outcome).toBe("failed");
    expect(result.notification).toMatchObject({
      status: "FAILED",
      attemptCount: 4,
      lastError: "AMQP publish failed: broker unavailable",
      processedAt: expect.any(Date),
    });
    expect(result.publishAttempts).toBe(4);
    expect(result.published).toHaveLength(0);
    expect(result.oldNotification).toBeNull();
    expect(result.remaining).toBeUndefined();
  }, 15_000);

  it("preserves confirmed delivery when it arrives before a failed AMQP confirm", async () => {
    const result = await exerciseDispatch("delivered-before-confirm-failure");

    expect(result.outcome).toBe("completed");
    expect(result.notification).toMatchObject({
      status: "SENT",
      attemptCount: 1,
      providerMessageId: "discord-message-1",
      lastError: null,
    });
    expect(result.publishAttempts).toBe(1);
    expect(result.published).toHaveLength(1);
    expect(result.remaining).toBeUndefined();
  }, 15_000);

  it("recovers a processing notification after the failed publish could not be reset in the database", async () => {
    const result = await exerciseDispatch("reset-failure");

    expect(result.outcome).toBe("completed");
    expect(result.notification).toMatchObject({
      status: "SENT",
      attemptCount: 2,
      providerMessageId: "discord-message-1",
      lastError: null,
    });
    expect(result.publishAttempts).toBe(2);
    expect(result.published).toHaveLength(1);
    expect(result.remaining).toBeUndefined();
  }, 15_000);

  it("retries a notification queued before native retry attempts were configured", async () => {
    const result = await exerciseDispatch("legacy-queued-job");

    expect(result.outcome).toBe("completed");
    expect(result.notification).toMatchObject({
      status: "SENT",
      attemptCount: 2,
      providerMessageId: "discord-message-1",
      lastError: null,
    });
    expect(result.publishAttempts).toBe(2);
    expect(result.published).toHaveLength(1);
    expect(result.remaining).toBeUndefined();
  }, 15_000);

  it("retains the retry when a retryable Discord failure arrives before the AMQP confirm fails", async () => {
    const result = await exerciseDispatch(
      "delivery-failure-before-confirm-failure",
    );

    expect(result.outcome).toBe("completed");
    expect(result.notification).toMatchObject({
      status: "SENT",
      attemptCount: 2,
      providerMessageId: "discord-message-1",
      lastError: null,
    });
    expect(result.publishAttempts).toBe(2);
    expect(result.published).toHaveLength(1);
    expect(result.remaining).toBeUndefined();
  }, 15_000);
});
