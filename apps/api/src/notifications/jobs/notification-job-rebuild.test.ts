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
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { makeNotificationContent } from "#src/notifications/content/notification-content.service";
import { makeNotificationEventStore } from "#src/notifications/delivery/notification-event-store";
import { makeNotificationsEvents } from "#src/notifications/delivery/notifications-events.handler";
import {
  makeNotificationJobRebuild,
  timerSourceEntityId,
} from "#src/notifications/jobs/notification-job-rebuild";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job-store";
import { makeNotificationMatching } from "#src/notifications/rules/notification-matching.service";
import { makeNotificationGuildTargets } from "#src/notifications/targets/notification-guild-targets";
import { applicationLogger } from "#src/shared/application-logger";

const minute = 60_000;

const timerRule = (id: number, npcIds: readonly number[]) =>
  createNotificationRuleFixture({
    id,
    ownerType: "GUILD",
    ownerId: "guild-1",
    guildId: "guild-1",
    world: "fobos",
    triggerType: "TIMER_BEFORE_SPAWN",
    filters: { npcIds: [...npcIds] },
    scheduleStrategy: "SPAWN_WINDOW_RELATIVE",
    scheduleAnchor: "MIN_SPAWN",
    scheduleOffsetMinutes: 5,
    scheduledAt: null,
  });

const channel = (
  id: number,
  overrides: { active?: boolean; canSend?: boolean } = {},
) =>
  createNotificationTargetFixture({
    id,
    ownerType: "GUILD",
    ownerId: "guild-1",
    targetType: "CHANNEL",
    externalId: `channel-${id}`,
    ...overrides,
  });

const seedTimerNotifications = async (options: {
  readonly rules: ReturnType<typeof timerRule>[];
  readonly links: ReadonlyArray<{ ruleId: number; targetId: number }>;
  readonly now: number;
}) => {
  const boundary = await createDatabaseBoundary();
  const { database } = boundary;

  await boundary.run(database.insert(guildTable).values(createGuildFixture()));
  await boundary.run(
    database.insert(memberTable).values(createMemberFixture()),
  );
  await boundary.run(
    database
      .insert(notificationTargetTable)
      .values([channel(1), channel(2), channel(3, { active: false })]),
  );
  await boundary.run(
    database.insert(notificationRuleTable).values(options.rules),
  );
  await boundary.run(
    database.insert(notificationRuleTargetTable).values([...options.links]),
  );
  await boundary.run(
    database.insert(timerTable).values(
      [101, 102, 103].map((npcId, index) => ({
        guildId: "guild-1",
        createdById: 1,
        npcId,
        timerKey: `hero:${npcId}`,
        world: "fobos",
        npc: { name: `NPC ${npcId}` },
        minSpawnTime: new Date(options.now + (60 + index) * minute),
        maxSpawnTime: new Date(options.now + 120 * minute),
        updatedAt: new Date(options.now),
      })),
    ),
  );

  const enqueued: string[] = [];

  const scheduler = makeNotificationJobScheduler(database, {
    add: (jobId) => Effect.sync(() => void enqueued.push(jobId)),
    remove: () => Effect.void,
  });

  const store = makeNotificationJobStore(database);
  const matching = makeNotificationMatching(database);
  const content = makeNotificationContent();

  const makeRebuild = (permitted: boolean) =>
    makeNotificationJobRebuild(
      {
        findRule: store.findRule,
        findRules: store.findRules,
        timers: store.findTimers,
      },
      (filters, npcId) => matching.matchesTimerRule(filters, npcId),
      () => Effect.succeed(permitted),
      {
        timer: (timerOptions) =>
          content.buildTimerNotificationPayload(timerOptions),
        scheduledMessage: (scheduledOptions) =>
          content.buildScheduledMessagePayload(scheduledOptions),
      },
      scheduler,
    );

  const jobs = () =>
    boundary.run(
      database
        .select({
          id: notificationJobTable.id,
          ruleId: notificationJobTable.ruleId,
          targetId: notificationJobTable.targetId,
          status: notificationJobTable.status,
          sourceEntityId: notificationJobTable.sourceEntityId,
          scheduledFor: notificationJobTable.scheduledFor,
        })
        .from(notificationJobTable)
        .orderBy(
          asc(notificationJobTable.ruleId),
          asc(notificationJobTable.sourceEntityId),
          asc(notificationJobTable.targetId),
          asc(notificationJobTable.status),
        ),
    );

  return {
    boundary,
    database,
    scheduler,
    store,
    matching,
    makeRebuild,
    enqueued,
    jobs,
  };
};

const staleTimerJob = (
  id: string,
  ruleId: number,
  npcId: number,
  scheduledFor: Date,
) =>
  createNotificationJobFixture({
    id,
    idempotencyKey: id,
    ruleId,
    targetId: 1,
    ownerType: "GUILD",
    ownerId: "guild-1",
    jobKind: "SCHEDULED",
    status: "PENDING",
    scheduledFor,
    sourceEntityType: "timer",
    sourceEntityId: timerSourceEntityId({
      guildId: "guild-1",
      world: "fobos",
      timerKey: `hero:${npcId}`,
    }),
  });

describe("notification job rebuild", () => {
  it("preserves the deployed timer source entity identifier", () => {
    expect(
      timerSourceEntityId({
        guildId: "guild-1",
        world: "fobos",
        timerKey: "hero:17",
      }),
    ).toBe("guild-1:fobos:hero:17");
  });

  it("does no scheduler work for a missing rule", async () => {
    const rebuild = makeNotificationJobRebuild(
      {
        findRule: () => Effect.succeed(null),
        findRules: () => Effect.die("rule lookup must not run"),
        timers: () => Effect.die("timer lookup must not run"),
      },
      () => true,
      () => Effect.succeed(true),
      { timer: () => ({}), scheduledMessage: () => ({}) },
      {
        cancel: () => Effect.die("cancel must not run"),
        create: () => Effect.die("create must not run"),
        enqueue: () => Effect.die("enqueue must not run"),
      },
    );

    await Effect.runPromise(rebuild.rebuildRule(404));
  });

  it("rebuilds a rule into one job per eligible target for every matching timer and cancels stale jobs", async () => {
    const now = Date.now();

    const fixture = await seedTimerNotifications({
      rules: [timerRule(7, [101, 102])],
      links: [1, 2, 3].map((targetId) => ({ ruleId: 7, targetId })),
      now,
    });

    try {
      await fixture.boundary.run(
        fixture.database
          .insert(notificationJobTable)
          .values(staleTimerJob("stale", 7, 101, new Date(now + minute))),
      );

      await fixture.boundary.run(fixture.makeRebuild(true).rebuildRule(7));

      const jobs = await fixture.jobs();

      expect(jobs.map(({ id, status }) => ({ id, status }))).toContainEqual({
        id: "stale",
        status: "CANCELED",
      });

      const created = jobs.filter(({ id }) => id !== "stale");

      expect(
        created.map(({ targetId, status, sourceEntityId, scheduledFor }) => ({
          targetId,
          status,
          sourceEntityId,
          scheduledFor: scheduledFor.getTime(),
        })),
      ).toEqual(
        [101, 102].flatMap((npcId, index) =>
          [1, 2].map((targetId) => ({
            targetId,
            status: "PENDING",
            sourceEntityId: `guild-1:fobos:hero:${npcId}`,
            scheduledFor: now + (55 + index) * minute,
          })),
        ),
      );
      expect(fixture.enqueued.toSorted()).toEqual(
        created.map(({ id }) => id).toSorted(),
      );
    } finally {
      await fixture.boundary.dispose();
    }
  });

  it("rebuilds an updated timer for every matching rule without touching other timers", async () => {
    const now = Date.now();

    const fixture = await seedTimerNotifications({
      rules: [timerRule(7, [101]), timerRule(8, []), timerRule(9, [102])],
      links: [
        { ruleId: 7, targetId: 1 },
        { ruleId: 7, targetId: 2 },
        { ruleId: 8, targetId: 2 },
        { ruleId: 8, targetId: 3 },
        { ruleId: 9, targetId: 1 },
      ],
      now,
    });

    try {
      await fixture.boundary.run(
        fixture.database
          .insert(notificationJobTable)
          .values([
            staleTimerJob("stale", 7, 101, new Date(now + minute)),
            staleTimerJob("other-timer", 8, 102, new Date(now + minute)),
          ]),
      );

      const events = makeNotificationsEvents({
        store: makeNotificationEventStore(fixture.database),
        scheduler: fixture.scheduler,
        matching: fixture.matching,
        guildTargets: makeNotificationGuildTargets(
          fixture.database,
          { selectable: () => Effect.die("channels must not be listed") },
          fixture.scheduler,
        ),
        findGuilds: () => Effect.succeed([]),
        delivery: () => Effect.void,
        rebuild: fixture.makeRebuild(false),
        logger: applicationLogger,
      });

      await fixture.boundary.run(
        events.handleTimerUpdated({
          guildId: "guild-1",
          world: "fobos",
          npcId: 101,
          timerKey: "hero:101",
          minSpawnTime: new Date(now + 90 * minute),
          maxSpawnTime: new Date(now + 120 * minute),
          npc: { name: "NPC 101" },
        }),
      );

      const jobs = await fixture.jobs();

      expect(
        jobs.map(({ ruleId, targetId, status, sourceEntityId }) => ({
          ruleId,
          targetId,
          status,
          sourceEntityId,
        })),
      ).toEqual([
        {
          ruleId: 7,
          targetId: 1,
          status: "BLOCKED",
          sourceEntityId: "guild-1:fobos:hero:101",
        },
        {
          ruleId: 7,
          targetId: 1,
          status: "CANCELED",
          sourceEntityId: "guild-1:fobos:hero:101",
        },
        {
          ruleId: 7,
          targetId: 2,
          status: "BLOCKED",
          sourceEntityId: "guild-1:fobos:hero:101",
        },
        {
          ruleId: 8,
          targetId: 2,
          status: "BLOCKED",
          sourceEntityId: "guild-1:fobos:hero:101",
        },
        {
          ruleId: 8,
          targetId: 1,
          status: "PENDING",
          sourceEntityId: "guild-1:fobos:hero:102",
        },
      ]);
      expect(fixture.enqueued).toEqual([]);
    } finally {
      await fixture.boundary.dispose();
    }
  });

  it("does not rebuild a timer for a rule disabled after it was listed", async () => {
    const now = Date.now();

    const fixture = await seedTimerNotifications({
      rules: [timerRule(7, [101])],
      links: [{ ruleId: 7, targetId: 1 }],
      now,
    });

    try {
      await fixture.boundary.run(
        fixture.database
          .update(notificationRuleTable)
          .set({ enabled: false })
          .where(eq(notificationRuleTable.id, 7)),
      );

      const failures = await fixture.boundary.run(
        fixture.makeRebuild(true).rebuildTimer([7], {
          guildId: "guild-1",
          world: "fobos",
          npcId: 101,
          timerKey: "hero:101",
          minSpawnTime: new Date(now + 90 * minute),
          maxSpawnTime: new Date(now + 120 * minute),
          npc: { name: "NPC 101" },
        }),
      );

      expect(failures).toEqual([]);
      expect(await fixture.jobs()).toEqual([]);
      expect(fixture.enqueued).toEqual([]);
    } finally {
      await fixture.boundary.dispose();
    }
  });
});
