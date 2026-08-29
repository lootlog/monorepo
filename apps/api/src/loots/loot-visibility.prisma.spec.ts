import { describe, expect, it } from "vitest";
import { NpcType, Permission, type Role } from "src/generated/prisma/client";
import {
  buildLootNpcVisibilitySql,
  buildLootNpcVisibilityWhere,
} from "./loot-visibility.prisma";

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

describe("loot visibility Prisma adapters", () => {
  it("requires every NPC to match one complete role grant", () => {
    const roles = [
      role(
        "complete",
        [Permission.LOOTLOG_LOOTS_READ, Permission.LOOTLOG_LOOTS_TITANS_READ],
        100,
        200,
      ),
    ];

    expect(buildLootNpcVisibilityWhere([], roles)).toEqual({
      AND: [
        { lootNpcs: { some: {} } },
        {
          lootNpcs: {
            every: {
              npcSnapshot: {
                OR: [
                  {
                    AND: [
                      { lvl: { not: null, gte: 100, lte: 200 } },
                      {
                        type: {
                          not: null,
                          notIn: [NpcType.HERO, NpcType.EVENT_HERO],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      ],
    });
  });

  it("keeps SQL visibility equivalent to the all-NPC Prisma policy", () => {
    const sql = buildLootNpcVisibilitySql(
      [],
      [
        role(
          "complete",
          [Permission.LOOTLOG_LOOTS_READ, Permission.LOOTLOG_LOOTS_HEROES_READ],
          50,
          250,
        ),
      ],
    );

    expect(sql).toContain("AND EXISTS");
    expect(sql).toContain("AND NOT EXISTS");
    expect(sql).toContain("visibility_npc.lvl BETWEEN 50 AND 250");
    expect(sql).toContain("visibility_npc.type NOT IN ('TITAN')");
  });

  it("fails closed without a complete role and grants only OWNER a bypass", () => {
    const adminRole = role("admin", [Permission.ADMIN]);

    expect(buildLootNpcVisibilityWhere([], [adminRole])).toEqual({
      id: { equals: -1 },
    });
    expect(buildLootNpcVisibilitySql([], [adminRole])).toBe("AND FALSE");
    expect(buildLootNpcVisibilityWhere([Permission.OWNER], [])).toBeNull();
    expect(buildLootNpcVisibilitySql([Permission.OWNER], [])).toBe("");
  });
});
