import { describe, expect, it } from "vitest";
import { Permission, type Role } from "#src/db/domain";
import { buildLootNpcVisibilitySql } from "./loot-visibility.prisma.js";

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

    expect(buildLootNpcVisibilitySql([], [adminRole])).toBe("AND FALSE");
    expect(buildLootNpcVisibilitySql([Permission.OWNER], [])).toBe("");
  });
});
