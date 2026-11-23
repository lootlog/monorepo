import { describe, expect, it } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/notification.schema";
import { makeNotificationJobDispatch } from "#src/notifications/jobs/notification-job-dispatch";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import {
  makeNotificationJobRecovery,
  NOTIFICATION_MISSED_DELIVERY_REASON,
} from "#src/notifications/jobs/notification-job-recovery";
import { makeNotificationJobRecurrence } from "#src/notifications/jobs/notification-job-recurrence";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job.repository";

describe("notification job recovery", () => {
  it("dispatches or closes PENDING jobs whose queue entry was lost", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const store = makeNotificationJobStore(database);
      const missedAt = new Date("2026-05-14T10:00:00.000Z");
      const lostAt = new Date(Date.now() - 5 * 60_000);
      const rule = createNotificationRuleFixture({ scheduledAt: missedAt });
      const target = createNotificationTargetFixture();
      const queued: Array<{ id: string; delay: number }> = [];

      await boundary.run(database.insert(notificationRuleTable).values(rule));
      await boundary.run(
        database.insert(notificationTargetTable).values(target),
      );
      await boundary.run(
        database
          .insert(notificationRuleTargetTable)
          .values({ ruleId: rule.id, targetId: target.id }),
      );

      await boundary.run(
        database.insert(notificationJobTable).values([
          createNotificationJobFixture({
            id: "missed",
            idempotencyKey: "missed",
            jobKind: "SCHEDULED",
            status: "PENDING",
            attemptCount: 0,
            scheduledFor: missedAt,
            sourceEntityType: "scheduled-message",
            sourceEntityId: String(rule.id),
          }),
          createNotificationJobFixture({
            id: "lost",
            idempotencyKey: "lost",
            status: "PENDING",
            attemptCount: 0,
            scheduledFor: lostAt,
          }),
          createNotificationJobFixture({
            id: "timer",
            idempotencyKey: "timer",
            jobKind: "SCHEDULED",
            status: "PENDING",
            attemptCount: 0,
            scheduledFor: new Date(Date.now() - 60 * 60_000),
            sourceEntityType: "timer",
            payloadSnapshot: {
              maxSpawnTime: new Date(Date.now() + 60 * 60_000).toISOString(),
            },
          }),
        ]),
      );

      const scheduler = makeNotificationJobScheduler(database, {
        remove: () => Effect.void,
        add: (id, delay) =>
          Effect.sync(() => {
            queued.push({ id, delay });
          }),
      });

      const recurrence = makeNotificationJobRecurrence(
        {
          findRule: store.findRule,
          cycleStatuses: store.cycleStatuses,
          advance: store.advanceRule,
        },
        () => Effect.succeed(true),
        { scheduledMessage: () => ({}) },
        scheduler,
      );

      const finalize = makeNotificationJobFinalization(
        () => Effect.void,
        recurrence,
      );

      const recover = makeNotificationJobRecovery(
        store,
        scheduler.enqueue,
        finalize,
        recurrence,
      );

      const startedAt = Date.now();
      await boundary.run(recover());

      const jobs = await boundary.run(
        database
          .select()
          .from(notificationJobTable)
          .orderBy(asc(notificationJobTable.scheduledFor)),
      );

      const [savedRule] = await boundary.run(
        database
          .select()
          .from(notificationRuleTable)
          .where(eq(notificationRuleTable.id, rule.id)),
      );

      const next = jobs.find(
        (job) => !["missed", "lost", "timer"].includes(job.id),
      );

      expect(jobs.find((job) => job.id === "missed")).toMatchObject({
        status: "FAILED",
        lastError: NOTIFICATION_MISSED_DELIVERY_REASON,
      });
      expect(jobs.find((job) => job.id === "lost")?.status).toBe("PENDING");
      expect(jobs.find((job) => job.id === "timer")?.status).toBe("PENDING");
      expect(jobs).toHaveLength(4);
      expect(next?.status).toBe("PENDING");
      expect(next?.scheduledFor.getTime()).toBeGreaterThan(startedAt);
      expect(next?.scheduledFor.getTime()).toBeLessThanOrEqual(
        startedAt + 24 * 60 * 60_000,
      );
      expect(savedRule?.scheduledAt).toEqual(next?.scheduledFor ?? null);
      expect(queued).toEqual(
        expect.arrayContaining([
          { id: "lost", delay: 0 },
          { id: "timer", delay: 0 },
        ]),
      );
      expect(queued.map(({ id }) => id).toSorted()).toEqual(
        ["lost", "timer", next!.id].toSorted(),
      );
    } finally {
      await boundary.dispose();
    }
  });

  it("moves a suspended Organization's recurring rule on after its skipped job could not be finalized", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const store = makeNotificationJobStore(database);
      const dueAt = new Date(Date.now() - 10 * 60_000);

      const rule = createNotificationRuleFixture({
        ownerType: "GUILD",
        ownerId: "guild-1",
        scheduledAt: dueAt,
      });

      const target = createNotificationTargetFixture({
        ownerType: "GUILD",
        ownerId: "guild-1",
        targetType: "CHANNEL",
        externalId: "channel-1",
      });

      await boundary.run(database.insert(notificationRuleTable).values(rule));
      await boundary.run(
        database.insert(notificationTargetTable).values(target),
      );
      await boundary.run(
        database
          .insert(notificationRuleTargetTable)
          .values({ ruleId: rule.id, targetId: target.id }),
      );
      await boundary.run(
        database.insert(notificationJobTable).values(
          createNotificationJobFixture({
            id: "due",
            idempotencyKey: "due",
            ownerType: "GUILD",
            ownerId: "guild-1",
            jobKind: "SCHEDULED",
            status: "PENDING",
            attemptCount: 0,
            scheduledFor: dueAt,
            sourceEntityType: "scheduled-message",
            sourceEntityId: String(rule.id),
          }),
        ),
      );

      const scheduler = makeNotificationJobScheduler(database, {
        remove: () => Effect.void,
        add: () => Effect.void,
      });

      const recurrence = makeNotificationJobRecurrence(
        {
          findRule: store.findRule,
          cycleStatuses: store.cycleStatuses,
          advance: store.advanceRule,
        },
        () => Effect.succeed(true),
        { scheduledMessage: () => ({}) },
        scheduler,
      );

      const dispatch = makeNotificationJobDispatch(
        {
          find: store.findJobWithRelations,
          update: store.updateJob,
          claim: store.claimJob,
          failClaim: store.failClaim,
          cancel: store.cancelJob,
          block: store.blockJob,
        },
        {
          hasRequiredGuildPermissions: () => Effect.succeed(true),
          isOrganizationOperational: () => Effect.succeed(false),
          canReadLootSource: () => Effect.succeed(true),
        },
        { publish: () => Effect.die("a suspended job is not published") },
        () => Effect.fail(new Error("finalization lost")),
        () => undefined,
        { filesFor: () => Effect.succeed([]) },
      );

      await boundary.run(Effect.ignore(dispatch("due", { retrying: false })));
      await boundary.run(Effect.ignore(dispatch("due", { retrying: true })));

      const recover = makeNotificationJobRecovery(
        store,
        scheduler.enqueue,
        makeNotificationJobFinalization(() => Effect.void, recurrence),
        recurrence,
      );

      const startedAt = Date.now();
      await boundary.run(recover());

      const [savedRule] = await boundary.run(
        database
          .select()
          .from(notificationRuleTable)
          .where(eq(notificationRuleTable.id, rule.id)),
      );

      const jobs = await boundary.run(
        database.select().from(notificationJobTable),
      );

      expect(jobs.find((job) => job.id === "due")?.status).toBe("CANCELED");
      expect(savedRule?.scheduledAt?.getTime()).toBeGreaterThan(startedAt);
      expect(jobs.find((job) => job.id !== "due")?.scheduledFor.getTime()).toBe(
        savedRule?.scheduledAt?.getTime(),
      );
    } finally {
      await boundary.dispose();
    }
  });

  it("reaches a stalled rule behind a full batch of rules that cannot advance", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const store = makeNotificationJobStore(database);
      const pastAt = new Date(Date.now() - 24 * 60 * 60_000);
      const endsSoon = new Date(Date.now() + 60_000);

      await boundary.run(
        database.insert(notificationRuleTable).values([
          ...Array.from({ length: 100 }, (_, index) =>
            createNotificationRuleFixture({
              id: index + 1,
              scheduledAt: pastAt,
              scheduledUntil: endsSoon,
            }),
          ),
          createNotificationRuleFixture({ id: 101, scheduledAt: pastAt }),
        ]),
      );

      const scheduler = makeNotificationJobScheduler(database, {
        remove: () => Effect.void,
        add: () => Effect.void,
      });

      const recurrence = makeNotificationJobRecurrence(
        {
          findRule: store.findRule,
          cycleStatuses: store.cycleStatuses,
          advance: store.advanceRule,
        },
        () => Effect.succeed(true),
        { scheduledMessage: () => ({}) },
        scheduler,
      );

      const recover = makeNotificationJobRecovery(
        store,
        scheduler.enqueue,
        makeNotificationJobFinalization(() => Effect.void, recurrence),
        recurrence,
      );

      await boundary.run(recover());
      await boundary.run(recover());

      const [stalled] = await boundary.run(
        database
          .select()
          .from(notificationRuleTable)
          .where(eq(notificationRuleTable.id, 101)),
      );

      expect(stalled?.scheduledAt?.getTime()).toBeGreaterThan(Date.now());
    } finally {
      await boundary.dispose();
    }
  });
});
