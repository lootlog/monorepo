import { describe, expect, it } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootSubmissionTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootAllocationPersistence } from "#src/loots/allocation/loot-allocation.repository";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import { buildLootStatsQueries } from "#src/loots/query/loot-stats-query";
import { makeUserFeed } from "#src/users/user-feed";
import { createOrganizationLootRecordFixture } from "../../../test/loot-fixtures.js";

describe("filtered loot reads", () => {
  it("uses each kill's retained NPC level across reads, search, feed, statistics and allocation", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = new Date();

      const permissions = [
        Capability.LOOTLOG_ACCESS,
        Capability.LOOTLOG_LOOTS_READ,
        Capability.LOOTLOG_LOOTS_WRITE,
      ];

      const [guild] = await run(
        database
          .insert(guildTable)
          .values({
            id: "revisions",
            name: "Revisions",
            ownerId: "owner",
            updatedAt: now,
          })
          .returning(),
      );

      const roles = await run(
        database
          .insert(roleTable)
          .values({
            id: "reader",
            guildId: "revisions",
            name: "Reader",
            permissions,
            lvlRangeFrom: 0,
            lvlRangeTo: 190,
            updatedAt: now,
          })
          .returning(),
      );

      if (!guild) throw new Error("Expected Organization");
      await run(
        database.insert(memberTable).values({
          id: 1,
          guildId: guild.id,
          userId: "reader-discord",
          globalUserId: "reader-user",
          name: "Reader",
          updatedAt: now,
        }),
      );
      await run(
        database.insert(memberToRoleTable).values({ A: 1, B: "reader" }),
      );
      await run(
        database.insert(npcSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            npcId: 52950,
            name: "Czempion Furboli",
            lvl: 183,
            type: "ELITE2",
            snapshotHash: "observed-183",
          },
          {
            gameVersion: "pl",
            id: 2,
            npcId: 52950,
            name: "Czempion Furboli",
            lvl: 210,
            type: "ELITE2",
            snapshotHash: "observed-210",
          },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values({
          gameVersion: "pl",
          id: 1,
          itemId: 1,
          statsHash: "legendary",
          name: "Reward",
          icon: "reward.gif",
          statRaw: "lvl=100;rarity=legendary",
          statsSnapshot: {},
          lvl: 100,
          rarity: "LEGENDARY",
        }),
      );

      for (const id of [1, 2]) {
        await run(
          database.insert(lootTable).values({
            gameVersion: "pl",
            id,
            uniqueId: `revision-${id}`,
            world: "test",
            location: "map",
            source: "FIGHT",
            updatedAt: now,
          }),
        );
        await run(
          database
            .insert(lootNpcTable)
            .values({ lootId: id, npcSnapshotId: id }),
        );
        await run(
          database
            .insert(lootItemTable)
            .values({ lootId: id, itemSnapshotId: 1, hid: `reward-${id}` }),
        );
        await run(
          database.insert(organizationLootRecordTable).values(
            createOrganizationLootRecordFixture({
              id,
              lootId: id,
              guildId: guild.id,
              updatedAt: now,
            }),
          ),
        );
        await run(
          database.insert(lootSubmissionTable).values({
            organizationLootRecordId: id,
            memberId: 1,
            updatedAt: now,
          }),
        );
      }

      const query = makeLootQueryOperations(makeLootQueryPersistence(database));

      const list = await run(
        query.fetchLootsByGuildId(guild, permissions, roles, {}),
      );

      expect(list.map(({ id }) => id)).toEqual([1]);
      expect(list[0]?.npcs[0]?.lvl).toBe(183);
      expect(
        await run(query.fetchLootById(guild, permissions, roles, 2)),
      ).toBeNull();
      expect(
        (await run(query.fetchLootById(guild, [Capability.OWNER], [], 2)))
          ?.npcs[0]?.lvl,
      ).toBe(210);
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, [Capability.OWNER], [], {
              npcLevelMin: 200,
            }),
          )
        ).map(({ id }) => id),
      ).toEqual([2]);
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, permissions, roles, {
              search: "Czempion",
            }),
          )
        ).map(({ id }) => id),
      ).toEqual([1]);
      expect(
        await run(
          query.resolveLootItemByHid(guild, permissions, roles, {
            hid: "reward-2",
          }),
        ),
      ).toBeNull();

      const feed = await run(makeUserFeed(database)("reader-discord"));
      expect(feed.items).toHaveLength(1);
      expect(feed.items[0]).toMatchObject({
        type: "loot",
        lootId: 1,
        npc: { lvl: 183 },
      });

      const stats = await run(
        Effect.all(
          buildLootStatsQueries(database, {
            guildId: guild.id,
            dateFrom: null,
            truncUnit: "day",
            visibility: buildLootNpcVisibilityCondition(
              organizationLootRecordTable.npcVisibility,
              permissions,
              roles,
            ),
          }),
        ),
      );

      expect(stats.overview[0]).toMatchObject({
        total_loots: 1,
        total_items: 1,
      });
      expect(stats.topNpcs).toEqual([expect.objectContaining({ lvl: 183 })]);

      const allocation = makeLootAllocationPersistence(database);

      const options = {
        actorDiscordId: "reader-discord",
        lootId: 2,
        submissionCutoff: new Date(now.getTime() - 60_000),
      };

      expect(
        await run(allocation.findAuthorizedLoot({ ...options, lootId: 1 })),
      ).toMatchObject({ id: 1 });
      expect(await run(allocation.findAuthorizedLoot(options))).toBeNull();
      expect(
        await run(allocation.findAuthorizedAllocationState(options)),
      ).toBeNull();
      expect(
        await run(
          allocation.compareAndSetChatAllocation({ ...options, lootShare: {} }),
        ),
      ).toBe(false);

      await run(
        database
          .update(roleTable)
          .set({ lvlRangeTo: 250 })
          .where(eq(roleTable.id, "reader")),
      );
      expect(await run(allocation.findAuthorizedLoot(options))).toMatchObject({
        id: 2,
      });
      await run(
        database
          .update(roleTable)
          .set({ lvlRangeTo: 190 })
          .where(eq(roleTable.id, "reader")),
      );
      expect(
        await run(
          allocation.compareAndSetChatAllocation({ ...options, lootShare: {} }),
        ),
      ).toBe(false);
      await run(
        database
          .update(organizationLootRecordTable)
          .set({ archivedAt: now })
          .where(eq(organizationLootRecordTable.id, 1)),
      );
      expect(
        await run(allocation.findAuthorizedLoot({ ...options, lootId: 1 })),
      ).toBeNull();
      expect(
        await run(
          allocation.compareAndSetChatAllocation({
            ...options,
            lootId: 1,
            lootShare: {},
          }),
        ),
      ).toBe(false);
    } finally {
      await boundary.dispose();
    }
  });
});
