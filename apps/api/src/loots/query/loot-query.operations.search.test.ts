import { describe, expect, it } from "bun:test";
import { Capability } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { guildTable } from "#src/database/drizzle/organization.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootPlayerTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  playerSnapshotTable,
} from "#src/database/drizzle/loot.schema";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.repository";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { createOrganizationLootRecordFixture } from "../../../test/loot-fixtures.js";

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
          {
            gameVersion: "pl",
            id: 1,
            npcId: 1,
            name: "Zbójca",
            type: "COMMON",
            lvl: 10,
          },
          {
            gameVersion: "pl",
            id: 2,
            npcId: 2,
            name: "Cienisty Golem",
            type: "COMMON",
            lvl: 20,
          },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            itemId: 1,
            statsHash: "a",
            name: "Miecz Mroku",
            icon: "",
            statRaw: "",
            statsSnapshot: {},
          },
          {
            gameVersion: "pl",
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
            gameVersion: "pl" as const,
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
          locations.map((_location, index) =>
            createOrganizationLootRecordFixture({
              lootId: index + 1,
              guildId: index === 5 ? "outside" : guild.id,
              updatedAt: now,
            }),
          ),
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
            query.fetchLootsByGuildId(guild, [Capability.OWNER], [], params),
          )
        ).map(({ id }) => id);

      expect(await search({ search: "smok" })).toEqual([]);
      expect(await search({ search: "cien" })).toEqual([4, 3, 2]);
      expect(await search({ search: "CIEN" })).toEqual([4, 3, 2]);
      expect(await search({ search: "Grota Cieni" })).toEqual([]);
      expect(await search({ search: "iecz Cieni" })).toEqual([2]);
      expect(await search({ search: "enisty" })).toEqual([3]);
      expect(await search({ search: "eniolub" })).toEqual([4]);
      expect(await search({ search: "cien", cursor: 3 })).toEqual([2]);
      expect(await search({ search: "cien", limit: 2 })).toEqual([4, 3]);
      expect(await search({ search: "cien", world: "other" })).toEqual([]);
      expect(
        await search({ search: "cien", npcs: ["Cienisty Golem"] }),
      ).toEqual([3]);
      expect(await search({ search: "  " })).toEqual([5, 4, 3, 2, 1]);
      expect(await search({ search: "%" })).toEqual([]);
      expect(await search({ search: "_" })).toEqual([]);
      expect(await search({ search: "Cien_sty" })).toEqual([]);
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});
