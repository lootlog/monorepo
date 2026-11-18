import { expect, it } from "bun:test";
import { asc, sql } from "drizzle-orm";
import { guildTable } from "#src/database/drizzle/organization.schema";
import {
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import { backfillOrganizationLootRecordFacts } from "#src/loots/backfill-organization-loot-record-facts";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";
import { createOrganizationLootRecordFixture } from "../../test/loot-fixtures.js";

it("fills records in every window from their loot's items and NPCs and leaves filled ones alone", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database, run } = boundary;

    // The second loot lies beyond the first 50,000-id window.
    const lootIds = [1, 60_001, 60_002];

    await run(
      database
        .insert(guildTable)
        .values(createGuildFixture({ id: "guild", ownerId: "owner" })),
    );
    await run(
      database.insert(lootTable).values(
        lootIds.map((id) => ({
          gameVersion: "pl" as const,
          id,
          uniqueId: `backfill-${id}`,
          world: "test",
          source: "FIGHT" as const,
          location: "map",
          updatedAt: new Date(0),
        })),
      ),
    );
    await run(
      database.insert(itemSnapshotTable).values(
        (["HEROIC", "LEGENDARY", null] as const).map((rarity, index) => ({
          id: index + 1,
          itemId: index + 1,
          gameVersion: "pl" as const,
          statsHash: `stats-${index}`,
          snapshotHash: `snapshot-${index}`,
          name: `item-${index}`,
          icon: "icon.gif",
          rarity,
          statRaw: "",
          statsSnapshot: {},
        })),
      ),
    );
    await run(
      database.insert(lootItemTable).values([
        { lootId: 1, itemSnapshotId: 1, hid: "a" },
        { lootId: 1, itemSnapshotId: 2, hid: "b" },
        { lootId: 1, itemSnapshotId: 3, hid: "c" },
        { lootId: 60_001, itemSnapshotId: 3, hid: "d" },
      ]),
    );
    await run(
      database.insert(npcSnapshotTable).values([
        {
          gameVersion: "pl",
          id: 1,
          npcId: 1,
          name: "Elite",
          type: "ELITE2",
          lvl: 40,
        },
        {
          gameVersion: "pl",
          id: 2,
          npcId: 2,
          name: "Titan",
          type: "TITAN",
          lvl: 120,
        },
        {
          gameVersion: "pl",
          id: 3,
          npcId: 3,
          name: "Hero",
          type: "EVENT_HERO",
          lvl: 70,
        },
        {
          gameVersion: "pl",
          id: 4,
          npcId: 4,
          name: "Unknown",
          type: null,
          lvl: 70,
        },
      ]),
    );
    await run(
      database.insert(lootNpcTable).values([
        { lootId: 1, npcSnapshotId: 1 },
        { lootId: 1, npcSnapshotId: 2 },
        { lootId: 60_001, npcSnapshotId: 3 },
        { lootId: 60_001, npcSnapshotId: 4 },
      ]),
    );
    await run(
      database
        .insert(organizationLootRecordTable)
        .values(
          lootIds.map((lootId) =>
            createOrganizationLootRecordFixture({ lootId, guildId: "guild" }),
          ),
        ),
    );
    // Records as they were before the columns existed, except the last one,
    // which holds values the backfill would not compute.
    await run(
      database.execute(
        sql`ALTER TABLE ${organizationLootRecordTable} ALTER COLUMN "lootRarityMask" DROP NOT NULL, ALTER COLUMN "npcTypeMask" DROP NOT NULL, ALTER COLUMN "npcVisibility" DROP NOT NULL`,
      ),
    );
    await run(
      database.execute(
        sql`UPDATE ${organizationLootRecordTable} SET "lootRarityMask" = CASE WHEN "lootId" = 60002 THEN 15 END, "npcTypeMask" = CASE WHEN "lootId" = 60002 THEN 1 END, "npcVisibility" = CASE WHEN "lootId" = 60002 THEN '{[7,8)}'::int4multirange END`,
      ),
    );

    const facts = () =>
      run(
        database
          .select({
            lootId: organizationLootRecordTable.lootId,
            lootRarityMask: organizationLootRecordTable.lootRarityMask,
            npcTypeMask: organizationLootRecordTable.npcTypeMask,
            npcVisibility: organizationLootRecordTable.npcVisibility,
          })
          .from(organizationLootRecordTable)
          .orderBy(asc(organizationLootRecordTable.lootId)),
      );

    expect(await run(backfillOrganizationLootRecordFacts)).toBe(2);
    expect(await facts()).toEqual([
      // Heroic and legendary items; an elite at 40 and a titan at 120.
      {
        lootId: 1,
        lootRarityMask: 6,
        npcTypeMask: 68,
        npcVisibility: "{[40,41),[2000120,2000121)}",
      },
      // No rarity; a hero at 70 and an NPC no grant can cover.
      {
        lootId: 60_001,
        lootRarityMask: 0,
        npcTypeMask: 32,
        npcVisibility: "{[-1,0),[1000070,1000071)}",
      },
      {
        lootId: 60_002,
        lootRarityMask: 15,
        npcTypeMask: 1,
        npcVisibility: "{[7,8)}",
      },
    ]);
    expect(await run(backfillOrganizationLootRecordFacts)).toBe(0);
  } finally {
    await boundary.dispose();
  }
});
