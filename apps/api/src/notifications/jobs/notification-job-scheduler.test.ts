import { Effect } from "effect";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { scheduleNotificationOccurrence } from "./notification-scheduled-occurrence.js";
import { describe, expect, it } from "bun:test";
import {
  NotificationJobKind,
  NotificationOwnerType,
  NotificationTargetType,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";
import {
  makeNotificationJobScheduler,
  notificationJobIdempotencyKey,
  type NotificationJobInput,
} from "#src/notifications/jobs/notification-job-scheduler";

const input = (jobKind: NotificationJobKind): NotificationJobInput => ({
  notificationRule: {
    id: 17,
    ownerType: NotificationOwnerType.GUILD,
    ownerId: "guild-1",
    guildId: "guild-1",
    triggerType: NotificationTriggerType.TIMER_BEFORE_SPAWN,
  },
  target: {
    id: 23,
    externalId: "channel-1",
    targetType: NotificationTargetType.CHANNEL,
    active: true,
    canSend: true,
  },
  jobKind,
  scheduledFor: new Date("2026-09-02T12:00:00.000Z"),
  sourceEntityType: "timer",
  sourceEntityId: "timer-1",
  sourceEventId: "event-1",
  payloadSnapshot: {},
});

describe("notification job scheduler", () => {
  it("preserves the scheduled-job idempotency contract", () => {
    expect(
      notificationJobIdempotencyKey(input(NotificationJobKind.SCHEDULED)),
    ).toBe("scheduled:17:23:timer:timer-1:2026-09-02T12:00:00.000Z");
  });

  it("preserves the test-job idempotency contract", () => {
    expect(notificationJobIdempotencyKey(input(NotificationJobKind.TEST))).toBe(
      "test:17:23:event-1",
    );
  });
});

for (const permitted of [true, false]) {
  it(`keeps repeated ${permitted ? "pending" : "blocked"} occurrences from adding extra queue work`, async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const database = boundary.database;
      const rule = createNotificationRuleFixture();
      const target = createNotificationTargetFixture();
      const scheduledAt = new Date(0);
      await boundary.run(database.insert(notificationRuleTable).values(rule));
      await boundary.run(
        database.insert(notificationTargetTable).values(target),
      );
      const queued: Array<{ id: string; delay: number }> = [];

      const scheduler = makeNotificationJobScheduler(database, {
        remove: () => Effect.die("unexpected removal"),
        add: (id, delay) =>
          Effect.sync(() => {
            queued.push({ id, delay });
          }),
      });

      const occurrence = scheduleNotificationOccurrence(
        {
          ...rule,
          targets: [
            {
              ruleId: rule.id,
              targetId: target.id,
              createdAt: new Date(0),
              target,
            },
          ],
        },
        scheduledAt,
        permitted,
        { scheduledMessage: () => ({}) },
        scheduler,
      );

      await boundary.run(occurrence);
      await boundary.run(occurrence);

      const jobs = await boundary.run(
        database.select().from(notificationJobTable),
      );

      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.status).toBe(permitted ? "PENDING" : "BLOCKED");
      expect(queued).toEqual(permitted ? [{ id: jobs[0]?.id, delay: 0 }] : []);
    } finally {
      await boundary.dispose();
    }
  });
}
