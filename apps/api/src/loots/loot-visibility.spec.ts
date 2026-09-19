import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import {
  lootTable,
  lootNpcTable,
  npcSnapshotTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import {
  buildLootNpcVisibilityCondition,
  toLootVisibilityRoles,
} from "#src/loots/loot-visibility";

import { createDatabaseBoundary } from "../../test/database-fixtures.js";

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
    discordAdmin: null,
    guildId: "guild-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("loot visibility", () => {
  it("maps database roles to the domain visibility contract", () => {
    expect(
      toLootVisibilityRoles([
        role("complete", [Permission.LOOTLOG_LOOTS_READ], 100, 200),
      ]),
    ).toEqual([
      {
        id: "complete",
        levelFrom: 100,
        levelTo: 200,
        permissions: [Permission.LOOTLOG_LOOTS_READ],
      },
    ]);
  });

  it("checks complete grants, empty encounters, owner bypass and normalized level bounds in the database", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      await run(
        database.insert(lootTable).values(
          [1, 2, 3].map((id) => ({
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
          { id: 1, npcId: 1, name: "Hero", type: "HERO", lvl: 50 },
          { id: 2, npcId: 2, name: "Unknown", type: null, lvl: 50 },
        ]),
      );
      await run(
        database.insert(lootNpcTable).values([
          { lootId: 1, npcSnapshotId: 1 },
          { lootId: 2, npcSnapshotId: 2 },
        ]),
      );

      const visible = async (permissions: Permission[], roles: Role[]) =>
        (
          await run(
            database
              .select({ id: lootTable.id })
              .from(lootTable)
              .where(
                buildLootNpcVisibilityCondition(
                  lootTable.id,
                  permissions,
                  roles,
                ),
              )
              .orderBy(lootTable.id),
          )
        ).map(({ id }) => id);

      expect(await visible([], [role("admin", [Permission.ADMIN])])).toEqual(
        [],
      );
      expect(await visible([Permission.OWNER], [])).toEqual([1, 2, 3]);
      expect(
        await visible([], [role("reader", [Permission.LOOTLOG_LOOTS_READ])]),
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
      ).toEqual([1]);
    } finally {
      await boundary.dispose();
    }
  });
});
