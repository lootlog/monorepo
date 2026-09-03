import { describe, expect, it } from "#test/bun-test";
import { Effect } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import { LootStatsService } from "#src/loots/query/loot-stats.service";

type Role = typeof roleTable.$inferSelect;

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

  it("returns a cached Effect result without executing SQL", async () => {
    const expected = {
      overview: {
        totalLoots: 0,
        totalItems: 0,
        legendaryItems: 0,
        heroicItems: 0,
        avgItemLevel: 0,
      },
      byRarity: {},
      timeline: [],
      topNpcs: [],
      topContributors: [],
      topItems: [],
    };
    const service = new LootStatsService(
      (() => Effect.die("SQL must not run on a cache hit")) as never,
      {
        getJson: async () => expected,
      } as never,
    );

    await expect(
      Effect.runPromise(
        service.getLootStatsEffect(
          "guild-1",
          createAccessPolicy({ capabilities: [Permission.LOOTLOG_LOOTS_READ] }),
          [role("role", [Permission.LOOTLOG_LOOTS_READ])],
        ),
      ),
    ).resolves.toEqual(expected);
  });
});
