import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { createGuildFixture } from "../../../test/organization-fixtures.js";
import {
  createNotificationJobFixture,
  createNotificationRuleFixture,
  createNotificationTargetFixture,
} from "../../../test/notification-fixtures.js";
import { UpdateNotificationRuleRequest } from "#src/contracts/notifications/schemas";
import {
  guildTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationRuleUnresolvedSelectionTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import { makeNotificationUserTargets } from "../targets/notification-user-targets.js";
import { makeNotificationRuleOperations } from "./notification-rule-operations.js";

test("five recent test deliveries exhaust the target quota but leave rule quota available", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    const oldest = new Date(Date.now() - 60_000);
    const userRule = createNotificationRuleFixture();

    const guildRule = createNotificationRuleFixture({
      id: 8,
      ownerType: "GUILD",
      ownerId: "guild-1",
      guildId: "guild-1",
    });

    const userTarget = createNotificationTargetFixture();

    const guildTarget = createNotificationTargetFixture({
      id: 10,
      ownerType: "GUILD",
      ownerId: "guild-1",
      targetType: "CHANNEL",
      externalId: "channel-1",
    });

    await boundary.run(
      database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      database.insert(notificationRuleTable).values([userRule, guildRule]),
    );
    await boundary.run(
      database
        .insert(notificationTargetTable)
        .values([userTarget, guildTarget]),
    );
    await boundary.run(
      database.insert(notificationRuleTargetTable).values([
        { ruleId: userRule.id, targetId: userTarget.id },
        { ruleId: guildRule.id, targetId: guildTarget.id },
      ]),
    );
    await boundary.run(
      database.insert(notificationJobTable).values(
        [
          { rule: userRule, target: userTarget },
          { rule: guildRule, target: guildTarget },
        ].flatMap(({ rule, target }) =>
          Array.from({ length: 5 }, (_, index) =>
            createNotificationJobFixture({
              id: `test-${target.id}-${index}`,
              idempotencyKey: `test-${target.id}-${index}`,
              ruleId: rule.id,
              targetId: target.id,
              ownerType: rule.ownerType,
              ownerId: rule.ownerId,
              jobKind: "TEST",
              status: "SENT",
              createdAt: new Date(oldest.getTime() + index * 1000),
            }),
          ),
        ),
      ),
    );

    const rules = makeNotificationRuleOperations(database, {
      ensureGuildPermissions: () => Effect.void,
      rebuildJobs: () => Effect.void,
      cancelJobs: () => Effect.void,
      buildTestPayload: () => Effect.succeed({}),
      createTestJob: () => Effect.succeed(null),
      enqueueJob: () => Effect.void,
    });

    const targets = makeNotificationUserTargets(database, {
      cancel: () => Effect.die("unexpected cancellation"),
      create: () => Effect.die("unexpected job creation"),
      enqueue: () => Effect.die("unexpected job enqueue"),
    });

    const [target] = await boundary.run(targets.list("user-1"));

    const {
      items: [rule],
    } = await boundary.run(rules.listGuild("guild-1"));

    expect(target?.testTrigger).toEqual({
      limit: 5,
      used: 5,
      remaining: 0,
      windowSeconds: 900,
      nextAvailableAt: new Date(oldest.getTime() + 15 * 60_000).toISOString(),
    });
    expect(rule?.testTrigger).toEqual({
      limit: 10,
      used: 5,
      remaining: 5,
      windowSeconds: 900,
      nextAvailableAt: null,
    });
  } finally {
    await boundary.dispose();
  }
});

test("preserves an omitted end date and persists an explicitly cleared end date", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    const endDate = new Date("2099-09-03T10:00:00.000Z");
    await boundary.run(
      database.insert(notificationRuleTable).values(
        createNotificationRuleFixture({
          scheduledUntil: endDate,
          scheduledAt: new Date(0),
        }),
      ),
    );

    const rules = makeNotificationRuleOperations(database, {
      ensureGuildPermissions: () => Effect.void,
      rebuildJobs: () => Effect.void,
      cancelJobs: () => Effect.void,
      buildTestPayload: () => Effect.succeed({}),
      createTestJob: () => Effect.succeed(null),
      enqueueJob: () => Effect.void,
    });

    const decode = Schema.decodeUnknownSync(UpdateNotificationRuleRequest);

    const beforeUpdate = Date.now();
    await boundary.run(
      rules.updateUser("user-1", 7, decode({ name: "Edited message" })),
    );
    const [edited] = await boundary.run(rules.listUser("user-1"));

    expect(edited?.scheduledUntil).toEqual(endDate);
    expect(edited?.scheduledAt?.getTime()).toBeGreaterThan(beforeUpdate);

    await boundary.run(
      rules.updateUser("user-1", 7, decode({ scheduledUntil: null })),
    );

    const [stored] = await boundary.run(
      database
        .select()
        .from(notificationRuleTable)
        .where(eq(notificationRuleTable.id, 7)),
    );

    expect(stored?.scheduledUntil).toBeNull();
    expect(stored?.scheduledAt).toEqual(edited?.scheduledAt);
    expect(
      (await boundary.run(rules.listUser("user-1")))[0]?.scheduledUntil,
    ).toBeNull();
  } finally {
    await boundary.dispose();
  }
});

test("a legacy NPC selection stays unresolved until the rule is saved without it, and never widens the rule", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const database = boundary.database;
    const rebuilt: number[] = [];

    await boundary.run(
      database.insert(guildTable).values(createGuildFixture()),
    );
    await boundary.run(
      database.insert(notificationRuleTable).values(
        createNotificationRuleFixture({
          id: 8,
          ownerType: "GUILD",
          ownerId: "guild-1",
          guildId: "guild-1",
          world: "fobos",
          triggerType: "TIMER_BEFORE_SPAWN",
          filters: { npcIds: [52553, 101] },
          scheduleStrategy: "SPAWN_WINDOW_RELATIVE",
          scheduleAnchor: "MIN_SPAWN",
          scheduleOffsetMinutes: 5,
          scheduledAt: null,
        }),
      ),
    );
    await boundary.run(
      database.insert(notificationRuleUnresolvedSelectionTable).values({
        ruleId: 8,
        kind: "npc",
        selectedId: 52553,
        selectedName: "Versus Zoons",
        reason: "legacyCatalogId",
        suggestedId: 333269,
        suggestedName: "Versus Zoons",
      }),
    );

    const rules = makeNotificationRuleOperations(database, {
      ensureGuildPermissions: () => Effect.void,
      rebuildJobs: (ruleId) => Effect.sync(() => void rebuilt.push(ruleId)),
      cancelJobs: () => Effect.void,
      buildTestPayload: () => Effect.succeed({}),
      createTestJob: () => Effect.succeed(null),
      enqueueJob: () => Effect.void,
    });

    const decode = Schema.decodeUnknownSync(UpdateNotificationRuleRequest);

    const listed = async () =>
      (await boundary.run(rules.listGuild("guild-1"))).items[0];

    expect((await listed())?.unresolvedSelections).toEqual([
      {
        kind: "npc",
        selectedId: 52553,
        selectedName: "Versus Zoons",
        reason: "legacyCatalogId",
        suggestedId: 333269,
        suggestedName: "Versus Zoons",
      },
    ]);

    await boundary.run(
      rules.updateGuild("guild-1", 8, decode({ name: "Renamed" })),
    );

    const renamed = await listed();

    expect(renamed?.unresolvedSelections).toHaveLength(1);
    expect(renamed?.filters).toEqual({ npcIds: [52553, 101] });

    await boundary.run(
      rules.updateGuild("guild-1", 8, decode({ npcIds: [333269, 101] })),
    );

    const reselected = await listed();

    expect(reselected?.unresolvedSelections).toEqual([]);
    expect(reselected?.filters).toEqual({ npcIds: [333269, 101] });
    expect(rebuilt).toEqual([8, 8]);
  } finally {
    await boundary.dispose();
  }
});
