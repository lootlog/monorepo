import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import {
  lootTable,
  lootNpcTable,
  npcSnapshotTable,
  organizationLootRecordTable,
} from "#src/database/drizzle/loot.schema";
import {
  guildTable,
  type roleTable,
} from "#src/database/drizzle/organization.schema";
import { buildLootNpcVisibilityCondition } from "./loot-visibility.js";

import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import { createOrganizationLootRecordFixture } from "../../test/loot-fixtures.js";
import { createGuildFixture } from "../../test/organization-fixtures.js";

type Role = typeof roleTable.$inferSelect;

function role(
  id: string,
  permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): Role {
  return {
    id,
    name: id,
    color: 0,
    position: 0,
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
    guildId: "guild-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("loot visibility", () => {
  it("checks complete grants, empty encounters, owner bypass and normalized level bounds in the database", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      await run(
        database.insert(lootTable).values(
          [1, 2, 3, 4].map((id) => ({
            gameVersion: "pl" as const,
            id,
            uniqueId: `visibility-${id}`,
            world: "world",
            location: "map",
            source: "FIGHT" as const,
            updatedAt: new Date(),
          })),
        ),
      );
      await run(
        database.insert(npcSnapshotTable).values([
          {
            gameVersion: "pl",
            id: 1,
            npcId: 1,
            name: "Hero",
            type: "HERO",
            lvl: 50,
          },
          {
            gameVersion: "pl",
            id: 2,
            npcId: 2,
            name: "Unknown",
            type: null,
            lvl: 50,
          },
          {
            gameVersion: "pl",
            id: 3,
            npcId: 3,
            name: "Low elite",
            type: "ELITE2",
            lvl: 40,
          },
          {
            gameVersion: "pl",
            id: 4,
            npcId: 4,
            name: "High elite",
            type: "ELITE2",
            lvl: 120,
          },
        ]),
      );
      await run(
        database.insert(lootNpcTable).values([
          { lootId: 1, npcSnapshotId: 1 },
          { lootId: 2, npcSnapshotId: 2 },
          { lootId: 4, npcSnapshotId: 3 },
          { lootId: 4, npcSnapshotId: 4 },
        ]),
      );
      await run(
        database
          .insert(guildTable)
          .values(createGuildFixture({ id: "guild-1", ownerId: "owner" })),
      );
      await run(
        database.insert(organizationLootRecordTable).values(
          [1, 2, 3, 4].map((lootId) =>
            createOrganizationLootRecordFixture({
              lootId,
              guildId: "guild-1",
            }),
          ),
        ),
      );

      const visible = async (permissions: Permission[], roles: Role[]) =>
        (
          await run(
            database
              .select({ id: organizationLootRecordTable.lootId })
              .from(organizationLootRecordTable)
              .where(
                buildLootNpcVisibilityCondition(
                  organizationLootRecordTable.npcVisibility,
                  permissions,
                  roles,
                ),
              )
              .orderBy(organizationLootRecordTable.lootId),
          )
        ).map(({ id }) => id);

      expect(await visible([], [role("admin", [Permission.ADMIN])])).toEqual(
        [],
      );
      expect(await visible([Permission.OWNER], [])).toEqual([1, 2, 3, 4]);
      expect(
        await visible([], [role("reader", [Permission.LOOTLOG_LOOTS_READ])]),
      ).toEqual([4]);
      // Two NPCs of one loot, each inside a different role's range: no single
      // range covers both, yet every NPC is covered.
      expect(
        await visible(
          [],
          [
            role("low", [Permission.LOOTLOG_LOOTS_READ], 1, 50),
            role("high", [Permission.LOOTLOG_LOOTS_READ], 100, 150),
          ],
        ),
      ).toEqual([4]);
      expect(
        await visible(
          [],
          [role("low", [Permission.LOOTLOG_LOOTS_READ], 1, 50)],
        ),
      ).toEqual([]);
      expect(
        await visible(
          [],
          [
            role(
              "hero",
              [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
              ],
              50.9,
              250,
            ),
          ],
        ),
      ).toEqual([1]);
      expect(
        await visible(
          [],
          [
            role(
              "hero",
              [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
              ],
              Number.NaN,
              Number.POSITIVE_INFINITY,
            ),
          ],
        ),
      ).toEqual([1, 4]);
      expect(
        await visible(
          [],
          [
            role("narrow-no-heroes", [Permission.LOOTLOG_LOOTS_READ], 1, 300),
            role(
              "lower-half-heroes",
              [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
              ],
              1,
              49,
            ),
            role(
              "upper-half-heroes",
              [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
              ],
              50,
              100,
            ),
            role(
              "dominated-heroes",
              [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
              ],
              20,
              60,
            ),
          ],
        ),
      ).toEqual([1, 4]);
    } finally {
      await boundary.dispose();
    }
  });
});
