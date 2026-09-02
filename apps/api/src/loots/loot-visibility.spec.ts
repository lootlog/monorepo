import { describe, expect, it } from "vitest";
import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import {
  buildLootNpcVisibilitySql,
  toLootVisibilityRoles,
} from "./loot-visibility.js";

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

  it("requires every NPC to match one complete role grant", () => {
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
