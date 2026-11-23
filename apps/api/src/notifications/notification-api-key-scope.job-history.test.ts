import { Capability } from "@lootlog/schema/permissions";
import { expect, test } from "bun:test";
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
} from "#src/database/drizzle/organization.schema";
import {
  lootTable,
  organizationLootRecordTable,
  npcSnapshotTable,
  lootNpcTable,
} from "#src/database/drizzle/loot.schema";
import {
  notificationRuleTable,
  notificationTargetTable,
  notificationJobTable,
} from "#src/database/drizzle/notification.schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { makeNotificationJobOperations } from "./jobs/notification-job-operations.js";
import { createOrganizationLootRecordFixture } from "../../test/loot-fixtures.js";
import { identity } from "./notification-api-key-scope.fixtures.js";

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
      (await boundary.run(jobs.listUser("discord-1"))).history.map(
        (job) => job.id,
      ),
    ).toEqual(["personal"]);
  } finally {
    await boundary.dispose();
  }
});

test.each([true, false])(
  "job history follows retained NPC levels and revoked sources (API key: %s)",
  async (useApiKey) => {
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
          lvlRangeTo: 190,
          permissions: [
            Capability.LOOTLOG_ACCESS,
            Capability.LOOTLOG_LOOTS_READ,
          ],
          updatedAt: new Date(0),
        }),
      );
      await boundary.run(
        database.insert(memberToRoleTable).values({ A: 1, B: "role" }),
      );
      await boundary.run(
        database.insert(lootTable).values({
          gameVersion: "pl",
          id: 1,
          uniqueId: "loot",
          world: "world",
          source: "FIGHT",
          location: "map",
          updatedAt: new Date(0),
        }),
      );
      await boundary.run(
        database.insert(npcSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            npcId: 99,
            name: "NPC",
            type: "ELITE2",
            lvl: 210,
            snapshotHash: "current",
          },
          {
            gameVersion: "pl",
            id: 2,
            npcId: 99,
            name: "NPC",
            type: "ELITE2",
            lvl: 183,
            snapshotHash: "original",
          },
        ]),
      );
      await boundary.run(
        database.insert(lootNpcTable).values({ lootId: 1, npcSnapshotId: 1 }),
      );
      await boundary.run(
        database.insert(organizationLootRecordTable).values(
          createOrganizationLootRecordFixture({
            lootId: 1,
            guildId: "1",
            updatedAt: new Date(0),
          }),
        ),
      );
      await boundary.run(
        database.insert(lootTable).values({
          gameVersion: "pl",
          id: 2,
          uniqueId: "old-loot",
          world: "world",
          source: "FIGHT",
          location: "map",
          updatedAt: new Date(0),
        }),
      );
      await boundary.run(
        database.insert(lootNpcTable).values({ lootId: 2, npcSnapshotId: 2 }),
      );
      await boundary.run(
        database.insert(organizationLootRecordTable).values(
          createOrganizationLootRecordFixture({
            lootId: 2,
            guildId: "1",
            updatedAt: new Date(0),
          }),
        ),
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
      await boundary.run(
        database.insert(notificationJobTable).values(
          createNotificationJobFixture({
            id: "old-job",
            idempotencyKey: "old-job",
            ownerId: "discord-1",
            status: "SENT",
            sourceEntityType: "loot",
            sourceEntityId: "2",
            payloadSnapshot: { guildIds: ["1"], content: "Older item dropped" },
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
            .pipe(
              Effect.provideService(
                ForwardAuthIdentity,
                useApiKey
                  ? identity
                  : { userId: identity.userId, discordId: identity.discordId },
              ),
            ),
        );

      expect((await list()).history.map((job) => job.id)).toEqual(["old-job"]);
      await boundary.run(
        database
          .update(roleTable)
          .set({ lvlRangeTo: 250 })
          .where(eq(roleTable.id, "role")),
      );
      expect((await list()).history.map((job) => job.id).sort()).toEqual([
        "job-1",
        "old-job",
      ]);
      await boundary.run(
        database
          .update(organizationLootRecordTable)
          .set({ archivedAt: new Date() })
          .where(eq(organizationLootRecordTable.lootId, 1)),
      );
      expect((await list()).history.map((job) => job.id)).toEqual(["old-job"]);
      await boundary.run(
        database
          .update(memberTable)
          .set({ active: false })
          .where(eq(memberTable.id, 1)),
      );
      expect((await list()).history).toEqual([]);
    } finally {
      await boundary.dispose();
    }
  },
);
