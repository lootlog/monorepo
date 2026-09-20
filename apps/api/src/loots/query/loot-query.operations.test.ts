import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";

describe("filtered loot reads", () => {
  it("preserves independent relation matches, visibility and pagination across lists and details", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = new Date("2026-09-16T00:00:00Z");

      const [guild] = await run(
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

      if (!guild) throw new Error("Expected Organization");

      const roles = await run(
        database
          .insert(roleTable)
          .values([
            {
              id: "low-common",
              guildId: guild.id,
              name: "Low common",
              permissions: [Permission.LOOTLOG_LOOTS_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: 100,
              updatedAt: now,
            },
            {
              id: "high-hero",
              guildId: guild.id,
              name: "High hero",
              permissions: [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
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
          { id: 1, npcId: 1, name: "Named common", type: "COMMON", lvl: 50 },
          { id: 2, npcId: 2, name: "High hero", type: "HERO", lvl: 250 },
          { id: 3, npcId: 3, name: "Low hero", type: "HERO", lvl: 50 },
          { id: 4, npcId: 4, name: "Unknown type", type: null, lvl: 50 },
          { id: 5, npcId: 5, name: "Unknown level", type: "COMMON", lvl: null },
          { id: 6, npcId: 6, name: "Named common", type: "COMMON", lvl: 75 },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values([
          {
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
      // Only 1 and 2 are readable with these roles. Higher IDs exercise
      // filtering before LIMIT, including records outside this Organization.
      await run(
        database.insert(lootTable).values(
          Array.from({ length: 8 }, (_, index) => ({
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
        database.insert(organizationLootRecordTable).values(
          Array.from({ length: 8 }, (_, index) => ({
            lootId: index + 1,
            guildId: index === 6 ? "foreign" : guild.id,
            archivedAt: index === 7 ? now : null,
            updatedAt: now,
          })),
        ),
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

      const permissions = [Permission.LOOTLOG_LOOTS_READ];

      const list = await run(
        query.fetchLootsByGuildId(guild, permissions, roles, filters),
      );

      expect(list.map(({ id }) => id)).toEqual([2, 1]);

      for (const { npcs, expectedIds } of [
        { npcs: [], expectedIds: [6, 5, 4, 3, 2, 1] },
        { npcs: ["Missing NPC"], expectedIds: [] },
        { npcs: ["Missing NPC", "Named common"], expectedIds: [5, 4, 3, 2, 1] },
      ]) {
        expect(
          (
            await run(
              query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {
                npcs,
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

      // A role granting heroes at high levels cannot authorize a low hero;
      // null metadata and empty encounters must also fail closed.
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

      // OWNER bypasses NPC restrictions, but never Organization isolation or archive state.
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {}),
          )
        ).map(({ id }) => id),
      ).toEqual([6, 5, 4, 3, 2, 1]);

      for (const lootId of [7, 8]) {
        expect(
          await run(query.fetchLootById(guild, [Permission.OWNER], [], lootId)),
        ).toBeNull();
      }

      expect(
        await run(
          query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {
            itemNames: ["Missing item"],
          }),
        ),
      ).toEqual([]);
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});

describe("free-text loot search", () => {
  it("matches item, NPC and player names, ignores map names, isolates Organizations and returns nothing for an unmatched term", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = new Date("2026-09-20T00:00:00Z");

      const [guild] = await run(
        database
          .insert(guildTable)
          .values([
            { id: "search", name: "Search", ownerId: "owner", updatedAt: now },
            {
              id: "outside",
              name: "Outside",
              ownerId: "owner",
              updatedAt: now,
            },
          ])
          .returning(),
      );

      if (!guild) throw new Error("Expected Organization");

      await run(
        database.insert(npcSnapshotTable).values([
          { id: 1, npcId: 1, name: "Zbójca", type: "COMMON", lvl: 10 },
          { id: 2, npcId: 2, name: "Cienisty Golem", type: "COMMON", lvl: 20 },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values([
          {
            id: 1,
            itemId: 1,
            statsHash: "a",
            name: "Miecz Mroku",
            icon: "",
            statRaw: "",
            statsSnapshot: {},
          },
          {
            id: 2,
            itemId: 2,
            statsHash: "b",
            name: "Miecz Cienia",
            icon: "",
            statRaw: "",
            statsSnapshot: {},
          },
        ]),
      );
      await run(
        database.insert(playerSnapshotTable).values([
          {
            id: 1,
            world: "test",
            accountId: 1,
            characterId: 1,
            snapshotHash: "a",
            name: "Wojtek",
          },
          {
            id: 2,
            world: "test",
            accountId: 2,
            characterId: 2,
            snapshotHash: "b",
            name: "Cieniolub",
          },
        ]),
      );

      // 2 matches through an item, 3 through an NPC, 4 through a player. 1
      // carries the term only in its map name and must not match. 5 matches
      // nothing, and 6 matches everywhere but belongs to another Organization.
      const locations = [
        "Grota Cieni",
        "Puszcza",
        "Puszcza",
        "Puszcza",
        "Puszcza",
        "Grota Cieni",
      ];

      await run(
        database.insert(lootTable).values(
          locations.map((location, index) => ({
            id: index + 1,
            uniqueId: `search-${index + 1}`,
            world: "test",
            source: "FIGHT" as const,
            location,
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(organizationLootRecordTable).values(
          locations.map((_location, index) => ({
            lootId: index + 1,
            guildId: index === 5 ? "outside" : guild.id,
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(lootNpcTable).values([
          { lootId: 1, npcSnapshotId: 1 },
          { lootId: 2, npcSnapshotId: 1 },
          { lootId: 3, npcSnapshotId: 2 },
          { lootId: 4, npcSnapshotId: 1 },
          { lootId: 5, npcSnapshotId: 1 },
          { lootId: 6, npcSnapshotId: 2 },
        ]),
      );
      await run(
        database.insert(lootItemTable).values([
          { lootId: 2, itemSnapshotId: 2, hid: "cien-hid" },
          { lootId: 5, itemSnapshotId: 1, hid: "mrok-hid" },
          { lootId: 6, itemSnapshotId: 2, hid: "outside-hid" },
        ]),
      );
      await run(
        database.insert(lootPlayerTable).values([
          { lootId: 4, playerSnapshotId: 2 },
          { lootId: 5, playerSnapshotId: 1 },
          { lootId: 6, playerSnapshotId: 2 },
        ]),
      );

      const query = makeLootQueryOperations(makeLootQueryPersistence(database));

      const search = async (
        params: Parameters<typeof query.fetchLootsByGuildId>[3],
      ) =>
        (
          await run(
            query.fetchLootsByGuildId(guild, [Permission.OWNER], [], params),
          )
        ).map(({ id }) => id);

      // A term that resolves to no snapshot and no location must return
      // nothing rather than dropping the predicate and listing every loot.
      expect(await search({ search: "smok" })).toEqual([]);
      // Loot 1 carries "Cieni" only in its map name, so it stays out.
      expect(await search({ search: "cien" })).toEqual([4, 3, 2]);
      // Case-insensitive substring semantics, one field at a time.
      expect(await search({ search: "CIEN" })).toEqual([4, 3, 2]);
      // A map name is not searchable, even an exact one.
      expect(await search({ search: "Grota Cieni" })).toEqual([]);
      expect(await search({ search: "iecz Cieni" })).toEqual([2]);
      expect(await search({ search: "enisty" })).toEqual([3]);
      expect(await search({ search: "eniolub" })).toEqual([4]);
      // Search intersects other filters instead of replacing them.
      expect(await search({ search: "cien", cursor: 3 })).toEqual([2]);
      expect(await search({ search: "cien", limit: 2 })).toEqual([4, 3]);
      expect(await search({ search: "cien", world: "other" })).toEqual([]);
      expect(
        await search({ search: "cien", npcs: ["Cienisty Golem"] }),
      ).toEqual([3]);
      // A blank term is not a filter.
      expect(await search({ search: "  " })).toEqual([5, 4, 3, 2, 1]);
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});
