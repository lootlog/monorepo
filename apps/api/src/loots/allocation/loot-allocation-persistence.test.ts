import { expect, test } from "bun:test";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import type { GuildLootShareUpdatedEventV2 } from "@lootlog/schema/loot-events";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootTable,
  lootSubmissionTable,
  memberTable,
  memberToRoleTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { makeLootAllocationPersistence } from "./loot-allocation-persistence.js";
import { makeLootAllocationOperations } from "./loot-allocation.operations.js";
import { applicationLogger } from "#src/shared/application-logger";

test("an API key cannot update a shared allocation when one Organization hides its NPC revision", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database, run } = boundary;
    const now = new Date();
    await run(
      database.insert(lootTable).values({
        id: 1,
        uniqueId: "shared-allocation",
        world: "world",
        source: "FIGHT",
        location: "map",
        updatedAt: now,
      }),
    );
    await run(
      database.insert(npcSnapshotTable).values({
        id: 1,
        npcId: 52950,
        name: "Czempion Furboli",
        type: "ELITE2",
        lvl: 210,
      }),
    );
    await run(
      database.insert(lootNpcTable).values({ lootId: 1, npcSnapshotId: 1 }),
    );

    for (const id of [1, 2]) {
      const guildId = String(id);
      await run(
        database.insert(guildTable).values(createGuildFixture({ id: guildId })),
      );
      await run(
        database.insert(memberTable).values(
          createMemberFixture({
            id,
            guildId,
            userId: "reader",
            globalUserId: "user",
          }),
        ),
      );
      await run(
        database.insert(roleTable).values({
          id: guildId,
          guildId,
          name: "Reader",
          updatedAt: now,
          permissions: [
            Permission.LOOTLOG_LOOTS_WRITE,
            Permission.LOOTLOG_LOOTS_READ,
          ],
          lvlRangeFrom: 0,
          lvlRangeTo: id === 1 ? 250 : 190,
        }),
      );
      await run(
        database.insert(memberToRoleTable).values({ A: id, B: guildId }),
      );
      await run(
        database
          .insert(organizationLootRecordTable)
          .values({ id, lootId: 1, guildId, updatedAt: now }),
      );
    }

    await run(
      database.insert(lootSubmissionTable).values({
        organizationLootRecordId: 1,
        memberId: 1,
        updatedAt: now,
      }),
    );
    const persistence = makeLootAllocationPersistence(database);

    const options = {
      actorUserId: "user",
      lootId: 1,
      submissionCutoff: new Date(now.getTime() - 60_000),
    };

    const keyed = <A, E>(effect: Effect.Effect<A, E>) =>
      run(
        effect.pipe(
          Effect.provideService(ForwardAuthIdentity, {
            userId: "user",
            discordId: "reader",
            apiKey: {
              keyId: "both",
              organizationIds: ["1", "2"],
              mode: "read-write",
              personalData: true,
              expiresAt: null,
            },
          }),
        ),
      );

    expect(await run(persistence.findAuthorizedLoot(options))).toMatchObject({
      id: 1,
    });
    expect(await keyed(persistence.findAuthorizedLoot(options))).toBeNull();
    expect(
      await keyed(persistence.findAuthorizedAllocationState(options)),
    ).toBeNull();
    expect(
      await keyed(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);

    await run(
      database
        .update(roleTable)
        .set({ lvlRangeTo: 250 })
        .where(eq(roleTable.id, "2")),
    );
    expect(await keyed(persistence.findAuthorizedLoot(options))).toMatchObject({
      id: 1,
    });
    await run(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: now })
        .where(eq(organizationLootRecordTable.id, 2)),
    );
    expect(await keyed(persistence.findAuthorizedLoot(options))).toBeNull();
    expect(
      await keyed(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    await run(
      database
        .update(organizationLootRecordTable)
        .set({ archivedAt: null })
        .where(eq(organizationLootRecordTable.id, 2)),
    );
    await run(
      database
        .update(roleTable)
        .set({ lvlRangeTo: 190 })
        .where(eq(roleTable.id, "2")),
    );
    expect(
      await keyed(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    // The trusted game session still confirms the same global fact from its visible submission.
    expect(
      await run(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(true);
  } finally {
    await boundary.dispose();
  }
});

test("allocation requires a recent actor submission and access to every organization at the atomic update", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database, run } = boundary;
    const now = new Date();
    await run(
      database
        .insert(guildTable)
        .values(
          ["1", "2"].map((id) =>
            createGuildFixture({ id, ownerId: "discord-1" }),
          ),
        ),
    );
    await run(
      database.insert(memberTable).values(
        createMemberFixture({
          id: 1,
          guildId: "1",
          userId: "discord-1",
          globalUserId: "user-1",
        }),
      ),
    );
    await run(
      database.insert(lootTable).values({
        id: 1,
        uniqueId: "allocation",
        world: "world",
        location: "map",
        source: "FIGHT",
        updatedAt: now,
      }),
    );
    await run(
      database
        .insert(organizationLootRecordTable)
        .values({ id: 1, lootId: 1, guildId: "1", updatedAt: now }),
    );
    await run(
      database
        .insert(lootSubmissionTable)
        .values({ organizationLootRecordId: 1, memberId: 1, updatedAt: now }),
    );
    const persistence = makeLootAllocationPersistence(database);

    const options = {
      actorUserId: "user-1",
      lootId: 1,
      submissionCutoff: new Date(Date.now() - 60_000),
    };

    const scoped = <A, E>(effect: Effect.Effect<A, E>) =>
      run(
        effect.pipe(
          Effect.provideService(ForwardAuthIdentity, {
            userId: "user-1",
            discordId: "discord-1",
            apiKey: {
              keyId: "key",
              organizationIds: ["1"],
              mode: "read-write",
              personalData: true,
              expiresAt: null,
            },
          }),
        ),
      );

    expect(await scoped(persistence.findAuthorizedLoot(options))).toMatchObject(
      { id: 1 },
    );
    expect(
      await scoped(
        persistence.findAuthorizedLoot({ ...options, actorUserId: "other" }),
      ),
    ).toBeNull();
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({
          ...options,
          actorUserId: "other",
          lootShare: {},
        }),
      ),
    ).toBe(false);
    await run(
      database
        .insert(organizationLootRecordTable)
        .values({ id: 2, lootId: 1, guildId: "2", updatedAt: now }),
    );
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    expect(
      await scoped(persistence.findAuthorizedAllocationState(options)),
    ).toBeNull();
    await run(
      database
        .delete(organizationLootRecordTable)
        .where(eq(organizationLootRecordTable.id, 2)),
    );
    await run(
      database
        .update(lootSubmissionTable)
        .set({ createdAt: new Date(Date.now() - 120_000) }),
    );
    expect(await scoped(persistence.findAuthorizedLoot(options))).toBeNull();
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    await run(
      database.update(lootSubmissionTable).set({ createdAt: new Date() }),
    );
    await run(
      database.insert(npcSnapshotTable).values({
        id: 1,
        npcId: 52950,
        name: "Legacy NPC",
        type: null,
        lvl: 183,
        wt: 80,
        prof: "WARRIOR",
      }),
    );
    await run(
      database.insert(lootNpcTable).values({ lootId: 1, npcSnapshotId: 1 }),
    );
    await run(
      database.insert(itemSnapshotTable).values({
        id: 1,
        itemId: 1,
        name: "Reward",
        icon: "reward.gif",
        statsHash: "reward",
        statRaw: "",
        statsSnapshot: {},
      }),
    );
    await run(
      database
        .insert(lootItemTable)
        .values({ lootId: 1, itemSnapshotId: 1, hid: "abc" }),
    );
    await run(
      database.insert(playerSnapshotTable).values({
        id: 1,
        characterId: 1,
        accountId: 2,
        name: "Player",
        world: "world",
        snapshotHash: "player",
      }),
    );
    await run(
      database
        .insert(lootPlayerTable)
        .values({ lootId: 1, playerSnapshotId: 1 }),
    );
    const published: GuildLootShareUpdatedEventV2[] = [];

    const operations = makeLootAllocationOperations({
      persistence,
      cache: { invalidateScopes: () => Effect.void },
      publisher: {
        publish: (_exchange, _routingKey, event) =>
          Effect.sync(() => {
            published.push(event);
          }),
      },
      logger: applicationLogger,
    });

    const update = () =>
      scoped(
        operations.confirmFromChat({
          actorUserId: "user-1",
          lootId: 1,
          message: 'Player otrzymał ITEM#abc:"Reward"',
        }),
      );

    await update();
    await update();
    // A legacy null type must stay unreadable to ordinary recipients; inferring HERO from
    // its weight would disclose an allocation that the HTTP source policy rejects.
    expect(published).toEqual([
      {
        version: 2,
        guildId: "1",
        lootId: 1,
        lootShare: { "12": ["abc"] },
        npcs: [{ type: null, lvl: 183, wt: 80, prof: "WARRIOR" }],
      },
    ]);
    expect(
      await scoped(
        persistence.compareAndSetChatAllocation({ ...options, lootShare: {} }),
      ),
    ).toBe(false);
    expect(
      await scoped(persistence.findAuthorizedAllocationState(options)),
    ).toEqual({
      lootShare: { "12": ["abc"] },
      lootShareSource: "CHAT_MESSAGE",
    });
  } finally {
    await boundary.dispose();
  }
});
