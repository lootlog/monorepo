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
  timerHistoryEntryTable,
  timerTable,
  userCharactersLootlogSettingsTable,
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
import { makeAutoTimer } from "#src/http-api/handlers/timers/timer-auto.data-layer";
import type { CreateAutoTimerRequest } from "#src/contracts/timers/schemas";
import { decodeRabbitEventJson } from "@lootlog/protocol/rabbit/events";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";

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
      (filters, timer) => matching.matchesTimerRule(filters, timer),
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

  it("never announces a closed spawn window and does not resend a past-due occurrence on the next rebuild", async () => {
    const now = Date.now();

    const fixture = await seedTimerNotifications({
      rules: [timerRule(7, [104, 105])],
      links: [{ ruleId: 7, targetId: 1 }],
      now,
    });

    try {
      await fixture.boundary.run(
        fixture.database.insert(timerTable).values([
          {
            guildId: "guild-1",
            createdById: 1,
            npcId: 104,
            timerKey: "hero:104",
            world: "fobos",
            npc: { name: "NPC 104" },
            minSpawnTime: new Date(now - 120 * minute),
            maxSpawnTime: new Date(now - 60 * minute),
            updatedAt: new Date(now - 180 * minute),
          },
          {
            guildId: "guild-1",
            createdById: 1,
            npcId: 105,
            timerKey: "hero:105",
            world: "fobos",
            npc: { name: "NPC 105" },
            minSpawnTime: new Date(now - 10 * minute),
            maxSpawnTime: new Date(now + 30 * minute),
            updatedAt: new Date(now - 60 * minute),
          },
        ]),
      );

      const rebuild = fixture.makeRebuild(true);

      await fixture.boundary.run(rebuild.rebuildRule(7));

      const first = await fixture.jobs();

      expect(first.map(({ sourceEntityId }) => sourceEntityId)).toEqual([
        "guild-1:fobos:hero:105",
      ]);

      await fixture.boundary.run(
        fixture.database
          .update(notificationJobTable)
          .set({ status: "SENT" })
          .where(eq(notificationJobTable.id, first[0]!.id)),
      );
      await fixture.boundary.run(rebuild.rebuildRule(7));

      expect(
        (await fixture.jobs()).map(({ id, status }) => ({ id, status })),
      ).toEqual([{ id: first[0]!.id, status: "SENT" }]);
    } finally {
      await fixture.boundary.dispose();
    }
  });

  it("keeps a past-due reminder sent under a pre-occurrence key but still announces a new spawn window", async () => {
    const now = Date.now();

    const fixture = await seedTimerNotifications({
      rules: [timerRule(7, [105, 106])],
      links: [{ ruleId: 7, targetId: 1 }],
      now,
    });

    const window = (minutes: readonly [number, number]) => ({
      minSpawnTime: new Date(now + minutes[0] * minute),
      maxSpawnTime: new Date(now + minutes[1] * minute),
    });

    const open = window([-10, 30]);

    try {
      await fixture.boundary.run(
        fixture.database.insert(timerTable).values(
          [105, 106].map((npcId) => ({
            guildId: "guild-1",
            createdById: 1,
            npcId,
            timerKey: `hero:${npcId}`,
            world: "fobos",
            npc: { name: `NPC ${npcId}` },
            ...open,
            updatedAt: new Date(now - 60 * minute),
          })),
        ),
      );

      // Sent before deploying occurrence keys: keyed by the moved time. The
      // job of 105 announced this window, the job of 106 an earlier one.
      await fixture.boundary.run(
        fixture.database.insert(notificationJobTable).values(
          (
            [
              [105, open],
              [106, window([-300, -260])],
            ] as const
          ).map(([npcId, sent]) =>
            createNotificationJobFixture({
              ...staleTimerJob(
                `legacy-${npcId}`,
                7,
                npcId,
                new Date(now - 5 * minute),
              ),
              targetId: 1,
              status: "SENT",
              payloadSnapshot: {
                minSpawnTime: sent.minSpawnTime.toISOString(),
                maxSpawnTime: sent.maxSpawnTime.toISOString(),
              },
            }),
          ),
        ),
      );

      await fixture.boundary.run(fixture.makeRebuild(true).rebuildRule(7));

      const created = (await fixture.jobs()).filter(
        ({ id }) => !id.startsWith("legacy-"),
      );

      expect(created.map(({ sourceEntityId }) => sourceEntityId)).toEqual([
        "guild-1:fobos:hero:106",
      ]);
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

  it("schedules a template rule for every spawn of that template from game client submissions", async () => {
    const now = Date.now();

    const templateRule = (
      id: number,
      overrides: Partial<ReturnType<typeof timerRule>>,
    ) => ({
      ...timerRule(id, []),
      filters: { npcTemplateIds: [257_636] },
      ...overrides,
    });

    const fixture = await seedTimerNotifications({
      rules: [
        templateRule(7, {}),
        templateRule(8, { world: "tempest" }),
        // A timer id rule keeps selecting only its own spawn.
        timerRule(10, [313_103]),
      ],
      links: [7, 8, 10].map((ruleId) => ({ ruleId, targetId: 1 })),
      now,
    });

    try {
      const { boundary, database } = fixture;

      await boundary.run(
        database
          .insert(guildTable)
          .values(createGuildFixture({ id: "guild-2", ownerId: "owner-2" })),
      );
      await boundary.run(
        database
          .insert(notificationRuleTable)
          .values(templateRule(9, { ownerId: "guild-2", guildId: "guild-2" })),
      );
      await boundary.run(
        database
          .insert(notificationRuleTargetTable)
          .values({ ruleId: 9, targetId: 1 }),
      );
      await boundary.run(
        database.update(guildTable).set({ ownerId: "user-1" }),
      );
      await boundary.run(
        database.insert(userCharactersLootlogSettingsTable).values({
          userId: "user-1",
          accountId: "1",
          characterId: "2",
          catchingGuildIds: ["guild-1"],
          updatedAt: new Date(now),
        }),
      );

      const events = makeNotificationsEvents({
        store: makeNotificationEventStore(database),
        scheduler: fixture.scheduler,
        matching: fixture.matching,
        guildTargets: makeNotificationGuildTargets(
          database,
          { selectable: () => Effect.die("channels must not be listed") },
          fixture.scheduler,
        ),
        findGuilds: () => Effect.succeed([]),
        delivery: () => Effect.void,
        rebuild: fixture.makeRebuild(true),
        logger: applicationLogger,
      });

      const published: string[] = [];

      const submit = makeAutoTimer(database, {
        get: () => Effect.succeed(null),
        set: () => Effect.void,
        setNx: () => Effect.succeed(true),
        releaseDedup: () => Effect.void,
        invalidateList: () => Effect.void,
        enqueueEventHeroCheck: () => Effect.void,
        withLock: (_key, operation) => operation,
        publish: (routingKey, payload) =>
          Effect.sync(() => {
            if (routingKey === RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED)
              published.push(JSON.stringify(payload));
          }),
      });

      const kill = (
        npc: Pick<CreateAutoTimerRequest["npc"], "id" | "templateId">,
      ) =>
        boundary.run(
          submit(
            { discordId: "user-1", userId: "user" },
            {
              respBaseSeconds: 3_600,
              world: "fobos",
              npc: {
                ...npc,
                name: "Vonaros",
                location: "Map",
                lvl: 64,
                wt: 31,
                icon: "vonaros.gif",
                type: 2,
              },
              accountId: "1",
              characterId: "2",
            },
          ),
        );

      // Two spawns of template 257636, then a spawn of another template.
      await kill({ id: 313_103, templateId: 257_636 });
      await kill({ id: 313_104, templateId: 257_636 });
      await kill({ id: 313_105, templateId: 300_351 });
      // A retried submission within the deduplication window is not a kill.
      await kill({ id: 313_103, templateId: 257_636 });

      for (const payload of published.splice(0)) {
        await boundary.run(
          events.handleTimerUpdated(
            decodeRabbitEventJson(
              RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
              payload,
            ),
          ),
        );
      }

      const scheduled = async () =>
        (await fixture.jobs())
          .filter(({ status }) => status === "PENDING")
          .map(({ ruleId, sourceEntityId }) => [ruleId, sourceEntityId]);

      const vonaros = (runtimeId: number) =>
        `guild-1:fobos:${runtimeId}:vonaros`;

      expect(await scheduled()).toEqual([
        [7, vonaros(313_103)],
        [7, vonaros(313_104)],
        [10, vonaros(313_103)],
      ]);

      // An older client reports only the runtime id after the next kill.
      await boundary.run(
        database
          .update(timerHistoryEntryTable)
          .set({ createdAt: new Date(now - 60_000) }),
      );
      await kill({ id: 313_104 });

      const timers = await boundary.run(
        database
          .select({ npcId: timerTable.npcId, npc: timerTable.npc })
          .from(timerTable)
          .where(eq(timerTable.npcId, 313_104)),
      );

      expect(timers).toMatchObject([{ npc: { templateId: 257_636 } }]);

      for (const payload of published.splice(0)) {
        await boundary.run(
          events.handleTimerUpdated(
            decodeRabbitEventJson(
              RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
              payload,
            ),
          ),
        );
      }

      expect(await scheduled()).toEqual([
        [7, vonaros(313_103)],
        [7, vonaros(313_104)],
        [10, vonaros(313_103)],
      ]);
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
