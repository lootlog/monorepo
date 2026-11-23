import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { createAccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";
import type { roleTable } from "#src/database/drizzle/organization.schema";
import { LootStatsService } from "./loot-stats.service.js";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import { organizationLootRecordFactsOf } from "#src/loots/loot-record-facts";

const facts = organizationLootRecordFactsOf(sql`"Loot".id`);

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

function role(id: string, permissions: Capability[]): Role {
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
  it("separates cache entries for different effective loot visibility", async () => {
    const keys: string[] = [];

    const service = new LootStatsService(database, {
      getOrSetJson: (options) => {
        keys.push(options.key);

        return Effect.die("Stop after the cache lookup");
      },
      setNX: () => Effect.succeed(true),
      setJson: () => Effect.void,
    });

    const read = (permissions: Capability[]) =>
      Effect.runPromiseExit(
        service.getLootStatsEffect(
          "guild-1",
          createAccessPolicy({ capabilities: permissions }),
          [role("role", permissions)],
          "7d",
        ),
      );

    await read([Capability.LOOTLOG_LOOTS_READ]);
    await read([
      Capability.LOOTLOG_LOOTS_READ,
      Capability.LOOTLOG_LOOTS_TITANS_READ,
    ]);

    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toMatch(/^loot-stats:guild-1:[^:]+:7d$/);
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
      getOrSetJson: (options) =>
        Effect.succeed(
          options.codec.parse(
            JSON.stringify({
              value: expected,
              computedAt: "2026-01-01T10:00:00.000Z",
            }),
          ),
        ),
      setNX: () => Effect.succeed(true),
      setJson: () => Effect.void,
    });

    await expect(
      Effect.runPromise(
        service.getLootStatsEffect(
          "guild-1",
          createAccessPolicy({ capabilities: [Capability.LOOTLOG_LOOTS_READ] }),
          [role("role", [Capability.LOOTLOG_LOOTS_READ])],
        ),
      ),
    ).resolves.toEqual({ ...expected, computedAt: "2026-01-01T10:00:00.000Z" });
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
            sql`insert into "Loot" (id, "uniqueId", world, source, location, "createdAt", "updatedAt", "gameVersion") values (1, 'several-npcs', 'test', 'FIGHT', 'Test', timestamp '2026-01-01 10:30:00', now(), 'pl'), (2, 'one-npc', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now(), 'pl'), (3, 'common-only', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now(), 'pl'), (4, 'archived', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now(), 'pl'), (5, 'other-organization', 'test', 'FIGHT', 'Test', timestamp '2026-01-08 10:30:00', now(), 'pl')`,
          );
          yield* db.execute(
            sql`insert into "NpcSnapshot" (id, "npcId", name, type, lvl, "gameVersion") values (1, 100, 'Hero', 'HERO', 100, 'pl'), (2, 200, 'Elite', 'ELITE2', 100, 'pl'), (3, 300, 'Elite III', 'ELITE3', 100, 'pl'), (4, 400, 'Common', 'COMMON', 100, 'pl')`,
          );
          yield* db.execute(
            sql`insert into "LootNpc" ("lootId", "npcSnapshotId") values (1,1), (1,2), (1,3), (1,4), (2,1), (3,4), (4,1), (5,1)`,
          );
          yield* db.execute(
            sql`insert into "ItemSnapshot" (id, "itemId", "statsHash", name, icon, lvl, rarity, "itemType", "statRaw", "statsSnapshot", "gameVersion") values (1, 101, 'legendary', 'Legendary', 'l.gif', 100, 'LEGENDARY', 'WEAPON', '', '{}', 'pl'), (2, 102, 'heroic', 'Heroic', 'h.gif', 100, 'HEROIC', 'WEAPON', '', '{}', 'pl'), (3, 103, 'unique', 'Unique', 'u.gif', 100, 'UNIQUE', 'WEAPON', '', '{}', 'pl'), (4, 104, 'plain', 'Plain', 'p.gif', 100, null, 'WEAPON', '', '{}', 'pl')`,
          );
          yield* db.execute(
            sql`insert into "LootItem" ("lootId", "itemSnapshotId", hid) values (1,1,'l-1'), (1,2,'h-1'), (1,3,'u-1'), (1,4,'p-1'), (2,1,'l-2'), (2,2,'h-2'), (2,4,'p-2'), (3,1,'l-3'), (4,1,'l-4'), (5,1,'l-5')`,
          );
          yield* db.execute(
            sql`insert into "OrganizationLootRecord" ("lootId", "guildId", "archivedAt", "updatedAt", "lootWorld", "lootCreatedAt", "lootRarityMask", "npcTypeMask", "npcVisibility") select v."lootId", v."guildId", v."archivedAt", now(), "Loot".world, "Loot"."createdAt", ${facts.lootRarityMask}, ${facts.npcTypeMask}, ${facts.npcVisibility} from (values (1, 'guild-1', null::timestamp), (2, 'guild-1', null), (3, 'guild-1', null), (4, 'guild-1', now()::timestamp), (5, 'guild-2', null)) as v("lootId", "guildId", "archivedAt") join "Loot" on "Loot".id = v."lootId"`,
          );
        }),
      );

      const permissions = [
        Capability.LOOTLOG_LOOTS_READ,
        Capability.LOOTLOG_LOOTS_HEROES_READ,
      ];

      const service = new LootStatsService(boundary.database, {
        getOrSetJson: (options) => options.factory,
        setNX: () => Effect.succeed(true),
        setJson: () => Effect.void,
      });

      const stats = await boundary.run(
        service.getLootStatsEffect(
          "guild-1",
          createAccessPolicy({ capabilities: permissions }),
          [role("role", permissions)],
          "all",
        ),
      );

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
