import { expect, it } from "bun:test";
import { asc } from "drizzle-orm";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { organizationLootRecordTable } from "#src/database/drizzle/loot.schema";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../../test/organization-fixtures.js";

it("writes the loot's rarities and NPC visibility on every Organization's record", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const { database, run } = boundary;

    await run(
      database
        .insert(guildTable)
        .values([
          createGuildFixture({ id: "first", ownerId: "owner" }),
          createGuildFixture({ id: "second", ownerId: "owner" }),
        ]),
    );
    await run(
      database
        .insert(memberTable)
        .values([
          createMemberFixture({ id: 1, guildId: "first", userId: "alice" }),
          createMemberFixture({ id: 2, guildId: "second", userId: "alice" }),
        ]),
    );

    const persistence = makeLootSubmissionAcceptancePersistence(database);

    const lootId = await run(
      persistence.createNewLoot(
        {
          mapPlayersSnapshot: null,
          uniqueId: "loot",
          world: "test",
          gameVersion: "pl",
          source: "FIGHT",
          location: "map",
          lootShare: {},
          lootShareSource: "NONE",
          items: [
            {
              itemId: 1,
              gameVersion: "pl",
              statsHash: "stats",
              snapshotHash: "snapshot",
              name: "Sword",
              icon: "sword.gif",
              lvl: 120,
              rarity: "HEROIC",
              itemType: "ONE_HAND_WEAPON",
              statRaw: "",
              statsSnapshot: {},
              hid: "hid",
              instanceStat: null,
            },
          ],
          players: [],
          npcs: [
            {
              npcId: 1,
              identityNamespace: "legacy",
              runtimeNpcId: null,
              name: "Titan",
              type: "TITAN",
              lvl: 120,
              icon: "titan.gif",
              wt: 100,
              margonemType: 0,
              prof: null,
            },
          ],
          submissions: [{ guildId: "first", memberId: 1 }],
        },
        () => [],
      ),
    );

    // A member of another Organization reports the same loot later.
    await run(
      persistence.appendSubmissions(
        lootId,
        [{ guildId: "second", memberId: 2 }],
        () => [],
      ),
    );

    expect(
      await run(
        database
          .select({
            guildId: organizationLootRecordTable.guildId,
            lootRarityMask: organizationLootRecordTable.lootRarityMask,
            npcTypeMask: organizationLootRecordTable.npcTypeMask,
            npcVisibility: organizationLootRecordTable.npcVisibility,
          })
          .from(organizationLootRecordTable)
          .orderBy(asc(organizationLootRecordTable.guildId)),
      ),
    ).toEqual([
      {
        guildId: "first",
        lootRarityMask: 2,
        npcTypeMask: 64,
        npcVisibility: "{[2000120,2000121)}",
      },
      {
        guildId: "second",
        lootRarityMask: 2,
        npcTypeMask: 64,
        npcVisibility: "{[2000120,2000121)}",
      },
    ]);
  } finally {
    await boundary.dispose();
  }
});
