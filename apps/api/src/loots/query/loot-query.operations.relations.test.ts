import { describe, expect, it } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  guildTable,
  memberTable,
  roleTable,
} from "#src/database/drizzle/organization.schema";
import {
  itemSnapshotTable,
  lootCommentTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { createOrganizationLootRecordFixture } from "../../../test/loot-fixtures.js";

describe("filtered loot reads", () => {
  it("preserves independent relation matches, visibility and pagination across lists and details", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = new Date("2026-09-16T00:00:00Z");

      const [guild, foreignGuild] = await run(
        database
          .insert(guildTable)
          .values([
            {
              id: "filtered",
              name: "Filtered",
              ownerId: "owner",
              updatedAt: now,
            },
            {
              id: "foreign",
              name: "Foreign",
              ownerId: "owner",
              updatedAt: now,
            },
          ])
          .returning(),
      );

      if (!guild || !foreignGuild) throw new Error("Expected Organizations");

      const roles = await run(
        database
          .insert(roleTable)
          .values([
            {
              id: "low-common",
              guildId: guild.id,
              name: "Low common",
              permissions: [Capability.LOOTLOG_LOOTS_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: 100,
              updatedAt: now,
            },
            {
              id: "high-hero",
              guildId: guild.id,
              name: "High hero",
              permissions: [
                Capability.LOOTLOG_LOOTS_READ,
                Capability.LOOTLOG_LOOTS_HEROES_READ,
              ],
              lvlRangeFrom: 200,
              lvlRangeTo: 300,
              updatedAt: now,
            },
          ])
          .returning(),
      );

      await run(
        database.insert(npcSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            npcId: 1,
            name: "Named common",
            type: "COMMON",
            lvl: 50,
          },
          {
            gameVersion: "pl",
            id: 2,
            npcId: 2,
            name: "High hero",
            type: "HERO",
            lvl: 250,
          },
          {
            gameVersion: "pl",
            id: 3,
            npcId: 3,
            name: "Low hero",
            type: "HERO",
            lvl: 50,
          },
          {
            gameVersion: "pl",
            id: 4,
            npcId: 4,
            name: "Unknown type",
            type: null,
            lvl: 50,
          },
          {
            gameVersion: "pl",
            id: 5,
            npcId: 5,
            name: "Unknown level",
            type: "COMMON",
            lvl: null,
          },
          {
            gameVersion: "pl",
            id: 6,
            npcId: 6,
            name: "Named common",
            type: "COMMON",
            lvl: 75,
          },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            itemId: 1,
            statsHash: "low",
            name: "Named item",
            icon: "",
            lvl: 50,
            rarity: "LEGENDARY",
            statRaw: "",
            statsSnapshot: {},
          },
          {
            gameVersion: "pl",
            id: 2,
            itemId: 2,
            statsHash: "high",
            name: "High item",
            icon: "",
            lvl: 250,
            rarity: "UNIQUE",
            statRaw: "",
            statsSnapshot: {},
          },
        ]),
      );
      await run(
        database.insert(lootTable).values(
          Array.from({ length: 8 }, (_, index) => ({
            gameVersion: "pl" as const,
            id: index + 1,
            uniqueId: `filtered-${index + 1}`,
            world: "test",
            source: "FIGHT" as const,
            location: "Test location",
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(memberTable).values([
          {
            id: 1,
            userId: "reader",
            guildId: guild.id,
            name: "Reader",
            updatedAt: now,
          },
          {
            id: 2,
            userId: "reader",
            guildId: foreignGuild.id,
            name: "Reader",
            updatedAt: now,
          },
        ]),
      );
      await run(
        database.insert(lootNpcTable).values([
          ...[1, 2, 3, 4, 5, 7, 8].flatMap((lootId) => [
            { lootId, npcSnapshotId: lootId === 2 ? 6 : 1 },
            { lootId, npcSnapshotId: 2 },
          ]),
          { lootId: 2, npcSnapshotId: 2 },
          { lootId: 3, npcSnapshotId: 3 },
          { lootId: 4, npcSnapshotId: 4 },
          { lootId: 5, npcSnapshotId: 5 },
        ]),
      );
      await run(
        database.insert(lootItemTable).values(
          Array.from({ length: 8 }, (_, index) => index + 1).flatMap(
            (lootId) => [
              { lootId, itemSnapshotId: 1, hid: "named-hid" },
              { lootId, itemSnapshotId: 1, hid: "duplicate-match" },
              { lootId, itemSnapshotId: 2, hid: "high-hid" },
            ],
          ),
        ),
      );
      await run(
        database.insert(organizationLootRecordTable).values(
          Array.from({ length: 8 }, (_, index) =>
            createOrganizationLootRecordFixture({
              id: 101 + index,
              lootId: index + 1,
              guildId: index === 6 ? "foreign" : guild.id,
              archivedAt: index === 7 ? now : null,
              updatedAt: now,
            }),
          ),
        ),
      );
      await run(
        database.insert(organizationLootRecordTable).values(
          createOrganizationLootRecordFixture({
            id: 200,
            lootId: 1,
            guildId: foreignGuild.id,
            updatedAt: now,
          }),
        ),
      );
      await run(
        database.insert(lootCommentTable).values(
          [101, 101, 200, 200, 200, 108].map((organizationLootRecordId) => ({
            organizationLootRecordId,
            memberId: organizationLootRecordId === 200 ? 2 : 1,
            content: "Organization comment",
            updatedAt: now,
          })),
        ),
      );
      const query = makeLootQueryOperations(makeLootQueryPersistence(database));

      const filters = {
        npcs: ["Named common"],
        npcTypes: ["HERO"],
        npcLevelMin: 200,
        itemNames: [" Named item ", "Named item"],
        rarities: ["LEGENDARY"],
        itemLevelMin: 200,
        hid: "high-hid",
        world: "test",
      } satisfies Parameters<typeof query.fetchLootsByGuildId>[3];

      const permissions = [Capability.LOOTLOG_LOOTS_READ];

      const list = await run(
        query.fetchLootsByGuildId(guild, permissions, roles, filters),
      );

      expect(list.map(({ id }) => id)).toEqual([2, 1]);
      expect(
        list.map(({ id, commentsCount }) => ({ id, commentsCount })),
      ).toEqual([
        { id: 2, commentsCount: 0 },
        { id: 1, commentsCount: 2 },
      ]);
      expect(
        (await run(query.fetchLootById(guild, permissions, roles, 1)))
          ?.commentsCount,
      ).toBe(2);
      expect(
        (
          await run(
            query.fetchLootById(foreignGuild, [Capability.OWNER], [], 1),
          )
        )?.commentsCount,
      ).toBe(3);

      for (const { npcs, expectedIds } of [
        { npcs: [], expectedIds: [6, 5, 4, 3, 2, 1] },
        { npcs: ["Missing NPC"], expectedIds: [] },
        { npcs: ["Missing NPC", "Named common"], expectedIds: [5, 4, 3, 2, 1] },
      ]) {
        expect(
          (
            await run(
              query.fetchLootsByGuildId(guild, [Capability.OWNER], [], {
                npcs,
              }),
            )
          ).map(({ id }) => id),
        ).toEqual(expectedIds);
      }

      for (const { rarities, expectedIds } of [
        { rarities: ["HEROIC" as const], expectedIds: [] },
        {
          rarities: ["HEROIC" as const, "UNIQUE" as const],
          expectedIds: [6, 5, 4, 3, 2, 1],
        },
      ]) {
        expect(
          (
            await run(
              query.fetchLootsByGuildId(guild, [Capability.OWNER], [], {
                rarities,
              }),
            )
          ).map(({ id }) => id),
        ).toEqual(expectedIds);
      }

      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, permissions, roles, {
              ...filters,
              limit: 1,
            }),
          )
        ).map(({ id }) => id),
      ).toEqual([2]);
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, permissions, roles, {
              ...filters,
              cursor: 2,
              limit: 1,
            }),
          )
        ).map(({ id }) => id),
      ).toEqual([1]);

      for (const lootId of [3, 4, 5, 6, 7, 8]) {
        expect(
          await run(query.fetchLootById(guild, permissions, roles, lootId)),
        ).toBeNull();
      }

      expect(
        (await run(query.fetchLootById(guild, permissions, roles, 2)))?.id,
      ).toBe(2);
      expect(
        await run(
          query.fetchLootsByGuildId(
            guild,
            permissions,
            roles.slice(0, 1),
            filters,
          ),
        ),
      ).toEqual([]);
      expect(
        await run(query.fetchLootsByGuildId(guild, permissions, [], filters)),
      ).toEqual([]);

      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, [Capability.OWNER], [], {}),
          )
        ).map(({ id }) => id),
      ).toEqual([6, 5, 4, 3, 2, 1]);

      for (const lootId of [7, 8]) {
        expect(
          await run(query.fetchLootById(guild, [Capability.OWNER], [], lootId)),
        ).toBeNull();
      }

      expect(
        await run(
          query.fetchLootsByGuildId(guild, [Capability.OWNER], [], {
            itemNames: ["Missing item"],
          }),
        ),
      ).toEqual([]);
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});
