import { describe, expect, it } from "vitest";
import { Permission, type Role } from "#src/generated/prisma/client";
import { LootStatsService } from "./loot-stats.service.js";

function role(id: string, permissions: Permission[]): Role {
  return {
    id,
    name: id,
    color: 0,
    position: 0,
    permissions,
    lvlRangeFrom: 1,
    lvlRangeTo: 500,
    guildId: "guild-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("LootStatsService access-scoped caching", () => {
  it("separates cache entries for different effective loot visibility", () => {
    const service = new LootStatsService({} as never, {} as never);
    const base = role("role", [Permission.LOOTLOG_LOOTS_READ]);
    const titan = role("role", [
      Permission.LOOTLOG_LOOTS_READ,
      Permission.LOOTLOG_LOOTS_TITANS_READ,
    ]);

    const baseKey = service["buildCacheKey"](
      "guild-1",
      [Permission.LOOTLOG_LOOTS_READ],
      [base],
      "7d",
    );
    const titanKey = service["buildCacheKey"](
      "guild-1",
      [Permission.LOOTLOG_LOOTS_READ, Permission.LOOTLOG_LOOTS_TITANS_READ],
      [titan],
      "7d",
    );

    expect(baseKey).not.toBe(titanKey);
    expect(baseKey).toMatch(/^loot-stats:guild-1:[^:]+:7d$/);
  });
});
