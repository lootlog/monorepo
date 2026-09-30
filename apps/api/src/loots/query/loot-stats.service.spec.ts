import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/schema";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";

const unexpectedQuery = () => {
  throw new Error("Unexpected SQL");
};

const database = {
  select: unexpectedQuery,
  selectDistinct: unexpectedQuery,
  $with: unexpectedQuery,
  with: unexpectedQuery,
};

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
    const service = new LootStatsService(database, {
      getOrSetJsonEffect: () => Effect.die("Unexpected cache read"),
      invalidateScopes: () =>
        Promise.reject(new Error("Unexpected cache invalidation")),
    });

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

    const service = new LootStatsService(database, {
      getOrSetJsonEffect: (options) =>
        Effect.succeed(options.codec.parse(JSON.stringify(expected))),
      invalidateScopes: () =>
        Promise.reject(new Error("Unexpected cache invalidation")),
    });

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

describe("LootStatsService aggregates", () => {
  it("derives rarity shares from timeline items and counts a top item once per loot", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      await boundary.run(
        Effect.gen(function* () {
          const db = boundary.database;
          yield* db.execute(
            sql`insert into "Guild" (id, name, "ownerId", "updatedAt") values ('guild-1', 'A', 'owner-a', now()), ('guild-2', 'B', 'owner-b', now())`,
          );
          yield* db.execute(
            sql`insert into "Loot" (id, "uniqueId", world, source, location, "createdAt", "updatedAt") values (1, 'several-npcs', 'test', 'FIGHT', 'Test', timestamp '2026-01-01 10:30:00', now()), (2, 'one-npc', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now()), (3, 'common-only', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now()), (4, 'archived', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now()), (5, 'other-organization', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now())`,
          );
          yield* db.execute(
            sql`insert into "OrganizationLootRecord" ("lootId", "guildId", "archivedAt", "updatedAt") values (1, 'guild-1', null, now()), (2, 'guild-1', null, now()), (3, 'guild-1', null, now()), (4, 'guild-1', now(), now()), (5, 'guild-2', null, now())`,
          );
          yield* db.execute(
            sql`insert into "NpcSnapshot" (id, "npcId", name, type, lvl) values (1, 100, 'Hero', 'HERO', 100), (2, 200, 'Elite', 'ELITE2', 100), (3, 300, 'Elite III', 'ELITE3', 100), (4, 400, 'Common', 'COMMON', 100)`,
          );
          yield* db.execute(
            sql`insert into "LootNpc" ("lootId", "npcSnapshotId") values (1,1), (1,2), (1,3), (1,4), (2,1), (3,4), (4,1), (5,1)`,
          );
          yield* db.execute(
            sql`insert into "ItemSnapshot" (id, "itemId", "statsHash", name, icon, lvl, rarity, "itemType", "statRaw", "statsSnapshot") values (1, 101, 'legendary', 'Legendary', 'l.gif', 100, 'LEGENDARY', 'WEAPON', '', '{}'), (2, 102, 'heroic', 'Heroic', 'h.gif', 100, 'HEROIC', 'WEAPON', '', '{}'), (3, 103, 'unique', 'Unique', 'u.gif', 100, 'UNIQUE', 'WEAPON', '', '{}'), (4, 104, 'plain', 'Plain', 'p.gif', 100, null, 'WEAPON', '', '{}')`,
          );
          yield* db.execute(
            sql`insert into "LootItem" ("lootId", "itemSnapshotId", hid) values (1,1,'l-1'), (1,2,'h-1'), (1,3,'u-1'), (1,4,'p-1'), (2,1,'l-2'), (2,2,'h-2'), (2,4,'p-2'), (3,1,'l-3'), (4,1,'l-4'), (5,1,'l-5')`,
          );
        }),
      );

      const permissions = [
        Permission.LOOTLOG_LOOTS_READ,
        Permission.LOOTLOG_LOOTS_HEROES_READ,
      ];

      const service = new LootStatsService(boundary.database, {
        getOrSetJsonEffect: (options) => options.factory,
        invalidateScopes: () =>
          Promise.reject(new Error("Unexpected cache invalidation")),
      });

      const stats = await boundary.run(
        service.getLootStatsEffect(
          "guild-1",
          createAccessPolicy({ capabilities: permissions }),
          [role("role", permissions)],
          "all",
        ),
      );

      // Items without a rarity stay in timeline totals but outside the rarity denominator.
      expect(stats.timeline).toEqual([
        {
          date: "2025-12-29T00:00:00.000Z",
          total: 4,
          byRarity: { LEGENDARY: 1, HEROIC: 1, UNIQUE: 1 },
        },
        {
          date: "2026-01-05T00:00:00.000Z",
          total: 4,
          byRarity: { LEGENDARY: 2, HEROIC: 1 },
        },
      ]);
      expect(stats.byRarity).toEqual({
        LEGENDARY: { count: 3, percentage: 50 },
        HEROIC: { count: 2, percentage: 33.3 },
        UNIQUE: { count: 1, percentage: 16.7 },
      });
      // Several qualifying NPCs on one loot must not multiply its item; COMMON-only loots do not qualify.
      expect(stats.topItems).toEqual([
        {
          itemId: 101,
          hid: "l-1",
          name: "Legendary",
          icon: "l.gif",
          rarity: "LEGENDARY",
          lvl: 100,
          count: 2,
        },
      ]);
    } finally {
      await boundary.dispose();
    }
  });
});
