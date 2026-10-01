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
} from "#src/database/drizzle/schema";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import {
  makeNotificationJobRecovery,
  NOTIFICATION_MISSED_DELIVERY_REASON,
} from "#src/notifications/jobs/notification-job-recovery";
import { makeNotificationJobRecurrence } from "#src/notifications/jobs/notification-job-recurrence";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job-store";

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

      // A daily reminder created by the recurrence whose delayed queue entry
      // never fired, and a recent job whose queue write failed.
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
          // A timer warning whose spawn window is still open.
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

      const finalize = makeNotificationJobFinalization(
        () => Effect.void,
        makeNotificationJobRecurrence(
          {
            findRule: store.findRule,
            cycleStatuses: store.cycleStatuses,
            advance: store.advanceRule,
          },
          () => Effect.succeed(true),
          { scheduledMessage: () => ({}) },
          scheduler,
        ),
      );

      const recover = makeNotificationJobRecovery(
        store,
        scheduler.enqueue,
        finalize,
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
      // The rule resumes at its next future occurrence; the months it missed
      // are not sent as a burst of stale reminders.
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
        ["lost", "timer", next?.id].toSorted(),
      );
    } finally {
      await boundary.dispose();
    }
  });
});
