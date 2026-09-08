import { NotificationTriggerType } from "@lootlog/schema/notifications";
import { Permission } from "@lootlog/schema/permissions";
import { expect, test, mock } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  createNotificationRuleFixture,
  createNotificationTargetFixture,
  createNotificationJobFixture,
} from "../../test/notification-fixtures.js";
import {
  guildTable,
  memberTable,
  roleTable,
  memberToRoleTable,
  lootTable,
  organizationLootRecordTable,
  npcSnapshotTable,
  lootNpcTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  notificationJobTable,
  watchedItemTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { makeNotificationRuleOperations } from "./rules/notification-rule-operations.js";
import { makeNotificationUserTargets } from "./targets/notification-user-targets.js";
import { makeNotificationWatchedItems } from "./rules/notification-watched-items.js";
import { makeNotificationJobOperations } from "./jobs/notification-job-operations.js";

const identity = {
  userId: "user-1",
  discordId: "discord-1",
  apiKey: {
    keyId: "key-1",
    organizationIds: ["1"],
    mode: "read-write" as const,
    personalData: true,
    expiresAt: null,
  },
};

test("keys cannot inspect or mutate multi-organization rules, watched items or shared targets outside their scope", async () => {
  const boundary = await createDatabaseBoundary();
  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "1", ownerId: "discord-1" }),
          createGuildFixture({ id: "2", ownerId: "discord-1" }),
        ]),
    );
    await boundary.run(
      database.insert(notificationRuleTable).values([
        createNotificationRuleFixture({
          id: 1,
          ownerId: "discord-1",
          triggerType: "WATCHED_ITEM_DROPPED",
          filters: { guildIds: ["1"] },
        }),
        createNotificationRuleFixture({
          id: 2,
          ownerId: "discord-1",
          triggerType: "WATCHED_ITEM_DROPPED",
          filters: { guildIds: ["1", "2"] },
        }),
        createNotificationRuleFixture({
          id: 3,
          ownerId: "discord-1",
          triggerType: "SCHEDULED_MESSAGE",
          filters: null,
        }),
      ]),
    );
    await boundary.run(
      database.insert(notificationTargetTable).values(
        createNotificationTargetFixture({
          ownerId: "discord-1",
          externalId: "discord-1",
        }),
      ),
    );
    await boundary.run(
      database.insert(notificationRuleTargetTable).values([
        { ruleId: 1, targetId: 9 },
        { ruleId: 2, targetId: 9 },
      ]),
    );
    await boundary.run(
      database.insert(watchedItemTable).values({
        id: 1,
        userId: "discord-1",
        itemId: 99,
        itemName: "Item",
        world: "world",
        notificationRuleId: 2,
        updatedAt: new Date(0),
      }),
    );
    const cancel = mock(() => Effect.void);
    const rules = makeNotificationRuleOperations(database, {
      ensureGuildPermissions: () => Effect.void,
      rebuildJobs: () => Effect.void,
      cancelJobs: cancel,
      buildTestPayload: () => Effect.succeed({}),
      createTestJob: () => Effect.succeed(null),
      enqueueJob: () => Effect.void,
    });
    const targets = makeNotificationUserTargets(database, {
      cancel,
      create: () => Effect.succeed(null),
      enqueue: () => Effect.void,
    });
    const watched = makeNotificationWatchedItems(
      database,
      { list: () => Effect.succeed([]) },
      { cancel },
    );
    const run = <A, E>(effect: Effect.Effect<A, E>) =>
      boundary.run(
        effect.pipe(Effect.provideService(ForwardAuthIdentity, identity)),
      );
    expect(
      (await run(rules.listUser("discord-1"))).map((rule) => rule.id).sort(),
    ).toEqual([1, 3]);
    expect(await run(watched.list("discord-1"))).toEqual([]);
    await expect(
      run(rules.updateUser("discord-1", 2, { enabled: false })),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(run(targets.remove("discord-1", 9))).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    await expect(
      run(
        watched.quickAdd("discord-1", "user-1", {
          guildId: "1",
          itemId: 99,
          itemName: "Item",
          world: "world",
        }),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(cancel).not.toHaveBeenCalled();
    expect(
      (
        await boundary.run(
          database
            .select()
            .from(notificationRuleTable)
            .where(eq(notificationRuleTable.id, 2)),
        )
      )[0]?.enabled,
    ).toBe(true);
    expect(
      await boundary.run(database.select().from(notificationTargetTable)),
    ).toHaveLength(1);
    await boundary.run(
      database
        .update(guildTable)
        .set({ active: false })
        .where(eq(guildTable.id, "1")),
    );
    expect(
      (await run(rules.listUser("discord-1"))).map((rule) => rule.id).sort(),
    ).toEqual([3]);
  } finally {
    await boundary.dispose();
  }
});

test("user job history checks original snapshot scopes even if its rule is now personal", async () => {
  const boundary = await createDatabaseBoundary();
  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(notificationRuleTable)
        .values(createNotificationRuleFixture({ ownerId: "discord-1" })),
    );
    await boundary.run(
      database
        .insert(notificationTargetTable)
        .values(createNotificationTargetFixture({ ownerId: "discord-1" })),
    );
    await boundary.run(
      database.insert(notificationJobTable).values([
        createNotificationJobFixture({
          id: "personal",
          idempotencyKey: "personal",
          ownerId: "discord-1",
          status: "SENT",
          sourceEntityType: "scheduled-message",
        }),
        createNotificationJobFixture({
          id: "old-loot",
          idempotencyKey: "old-loot",
          ownerId: "discord-1",
          status: "SENT",
          sourceEntityType: "loot",
          payloadSnapshot: { guildIds: ["2"], content: "hidden org data" },
        }),
      ]),
    );
    const jobs = makeNotificationJobOperations(database, {
      cancel: () => Effect.void,
    });
    const result = await boundary.run(
      jobs
        .listUser("discord-1")
        .pipe(Effect.provideService(ForwardAuthIdentity, identity)),
    );
    expect(result.history.map((job) => job.id)).toEqual(["personal"]);
    expect(
      (await boundary.run(jobs.listUser("discord-1"))).history,
    ).toHaveLength(2);
  } finally {
    await boundary.dispose();
  }
});

test("new user event rules keep the effective key organizations when their filters change", async () => {
  const boundary = await createDatabaseBoundary();
  try {
    const database = boundary.database;
    await boundary.run(
      database
        .insert(guildTable)
        .values(createGuildFixture({ id: "1", ownerId: "discord-1" })),
    );
    await boundary.run(
      database
        .insert(notificationTargetTable)
        .values(createNotificationTargetFixture({ ownerId: "discord-1" })),
    );
    const rules = makeNotificationRuleOperations(database, {
      ensureGuildPermissions: () => Effect.void,
      rebuildJobs: () => Effect.void,
      cancelJobs: () => Effect.void,
      buildTestPayload: () => Effect.succeed({}),
      createTestJob: () => Effect.succeed(null),
      enqueueJob: () => Effect.void,
    });
    const created = await boundary.run(
      rules
        .createUser("discord-1", {
          triggerType: NotificationTriggerType.WATCHED_ITEM_DROPPED,
          targetIds: [9],
          itemIds: [10],
        })
        .pipe(Effect.provideService(ForwardAuthIdentity, identity)),
    );
    expect(created.filters).toEqual({ itemIds: [10], guildIds: ["1"] });
    const updated = await boundary.run(
      rules
        .updateUser("discord-1", created.id, { itemIds: [20] })
        .pipe(Effect.provideService(ForwardAuthIdentity, identity)),
    );
    expect(updated.filters).toEqual({ itemIds: [20], guildIds: ["1"] });
  } finally {
    await boundary.dispose();
  }
});

test("job history follows the original loot NPC policy and archival state", async () => {
  const boundary = await createDatabaseBoundary();
  try {
    const database = boundary.database;
    await boundary.run(
      database.insert(guildTable).values(createGuildFixture({ id: "1" })),
    );
    await boundary.run(
      database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "1",
          userId: "discord-1",
          globalUserId: "user-1",
        }),
      ),
    );
    await boundary.run(
      database.insert(roleTable).values({
        id: "role",
        guildId: "1",
        name: "Reader",
        lvlRangeFrom: 0,
        lvlRangeTo: 100,
        permissions: [Permission.LOOTLOG_ACCESS, Permission.LOOTLOG_LOOTS_READ],
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      database.insert(memberToRoleTable).values({ A: 1, B: "role" }),
    );
    await boundary.run(
      database.insert(lootTable).values({
        id: 1,
        uniqueId: "loot",
        world: "world",
        source: "FIGHT",
        location: "map",
        updatedAt: new Date(0),
      }),
    );
    await boundary.run(
      database
        .insert(organizationLootRecordTable)
        .values({ lootId: 1, guildId: "1", updatedAt: new Date(0) }),
    );
    await boundary.run(
      database
        .insert(npcSnapshotTable)
        .values({ id: 1, npcId: 99, name: "NPC", type: "ELITE2", lvl: 200 }),
    );
    await boundary.run(
      database.insert(lootNpcTable).values({ lootId: 1, npcSnapshotId: 1 }),
    );
    await boundary.run(
      database.insert(notificationRuleTable).values(
        createNotificationRuleFixture({
          ownerId: "discord-1",
          triggerType: "WATCHED_ITEM_DROPPED",
          filters: { guildIds: ["1"] },
        }),
      ),
    );
    await boundary.run(
      database
        .insert(notificationTargetTable)
        .values(createNotificationTargetFixture({ ownerId: "discord-1" })),
    );
    await boundary.run(
      database.insert(notificationJobTable).values(
        createNotificationJobFixture({
          ownerId: "discord-1",
          status: "SENT",
          sourceEntityType: "loot",
          sourceEntityId: "1",
          payloadSnapshot: { guildIds: ["1"], content: "Item dropped" },
        }),
      ),
    );
    const jobs = makeNotificationJobOperations(database, {
      cancel: () => Effect.void,
    });
    const list = () =>
      boundary.run(
        jobs
          .listUser("discord-1")
          .pipe(Effect.provideService(ForwardAuthIdentity, identity)),
      );
    expect((await list()).history).toEqual([]);
    await boundary.run(
      database
        .update(roleTable)
        .set({ lvlRangeTo: 250 })
        .where(eq(roleTable.id, "role")),
    );
    expect((await list()).history.map((job) => job.id)).toEqual(["job-1"]);
    await boundary.run(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: new Date() })
        .where(eq(organizationLootRecordTable.guildId, "1")),
    );
    expect((await list()).history).toEqual([]);
  } finally {
    await boundary.dispose();
  }
});
