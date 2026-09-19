import { Permission } from "@lootlog/schema/permissions";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import { describe, expect, it } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { guildTable, lootTable } from "#src/database/drizzle/schema";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  buildLootStatsQueries,
  LootStatsQueryError,
  runLootStatsQuery,
} from "#src/loots/query/loot-stats-query";

describe("runLootStatsQuery", () => {
  it("binds input as a value instead of executing SQL text", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const value = "O'Connor; SELECT 42";
      await boundary.run(
        boundary.database.insert(guildTable).values({
          id: value,
          name: "Stats",
          ownerId: "owner",
          updatedAt: new Date(),
        }),
      );
      expect(
        await boundary.run(
          runLootStatsQuery(
            "loot-stats.test",
            boundary.database
              .select({ value: guildTable.id })
              .from(guildTable)
              .where(eq(guildTable.id, value)),
          ),
        ),
      ).toEqual([{ value }]);
    } finally {
      await boundary.dispose();
    }
  });

  it("maps database failures to an operation-specific error", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const error = await boundary.run(
        Effect.flip(
          runLootStatsQuery(
            "loot-stats.read",
            boundary.database
              .select({ value: sql`missing_column` })
              .from(guildTable),
          ),
        ),
      );

      expect(error).toBeInstanceOf(LootStatsQueryError);
      expect(error).toMatchObject({ operation: "loot-stats.read" });
      expect(error.cause).toBeDefined();
    } finally {
      await boundary.dispose();
    }
  });
});

describe("loot statistics at the PostgreSQL boundary", () => {
  it("keeps Organization visibility and distinct counts with enum NPC filters and multi-item joins", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      await boundary.run(
        Effect.gen(function* () {
          const db = boundary.database;
          yield* db.execute(
            sql`insert into "Guild" (id, name, "ownerId", "updatedAt") values ('stats-a', 'A', 'owner-a', now()), ('stats-b', 'B', 'owner-b', now())`,
          );
          yield* db.execute(
            sql`insert into "Member" (id, "guildId", "userId", name, "updatedAt") values (1, 'stats-a', 'reader-a', 'Reader A', now()), (2, 'stats-b', 'reader-b', 'Reader B', now())`,
          );
          yield* db.execute(
            sql`insert into "Loot" (id, "uniqueId", world, source, location, "createdAt", "updatedAt") values (1, 'stats-1', 'test', 'FIGHT', 'Test', timestamp '2026-01-01 10:30:00', now()), (2, 'stats-2', 'test', 'FIGHT', 'Test', timestamp '2026-01-01 10:30:00', now()), (3, 'stats-3', 'test', 'FIGHT', 'Test', timestamp '2026-01-01 10:30:00', now())`,
          );
          yield* db.execute(
            sql`insert into "OrganizationLootRecord" (id, "lootId", "guildId", "archivedAt", "updatedAt") values (1, 1, 'stats-a', null, now()), (2, 1, 'stats-b', null, now()), (3, 2, 'stats-a', null, now()), (4, 3, 'stats-a', now(), now())`,
          );
          yield* db.execute(
            sql`insert into "NpcSnapshot" (id, "npcId", name, type, lvl) values (1, 100, 'Hero', 'HERO', 100), (2, 200, 'Elite', 'ELITE2', 100), (3, 300, 'Titan', 'TITAN', 100)`,
          );
          yield* db.execute(
            sql`insert into "LootNpc" ("lootId", "npcSnapshotId") values (1,1), (1,2), (2,1), (2,3), (3,1)`,
          );
          yield* db.execute(
            sql`insert into "ItemSnapshot" (id, "itemId", "statsHash", name, icon, lvl, rarity, "itemType", "statRaw", "statsSnapshot") values (1, 101, 'legendary', 'Legendary', 'l.gif', 100, 'LEGENDARY', 'WEAPON', '', '{}'), (2, 102, 'heroic', 'Heroic', 'h.gif', 100, 'HEROIC', 'WEAPON', '', '{}')`,
          );
          yield* db.execute(
            sql`insert into "LootItem" ("lootId", "itemSnapshotId", hid) values (1,1,'legendary-b'), (1,1,'legendary-a'), (1,2,'heroic'), (2,1,'hidden'), (3,1,'archived')`,
          );
          yield* db.execute(
            sql`insert into "LootSubmission" ("organizationLootRecordId", "memberId", "updatedAt") values (1,1,now()), (2,2,now()), (3,1,now()), (4,1,now())`,
          );
        }),
      );

      const permissions = [
        Permission.LOOTLOG_LOOTS_READ,
        Permission.LOOTLOG_LOOTS_HEROES_READ,
      ];

      const visibility = buildLootNpcVisibilityCondition(
        lootTable.id,
        permissions,
        [{ permissions, lvlRangeFrom: 1, lvlRangeTo: 500 }],
      );

      for (const npcTypes of [undefined, [NpcType.HERO, NpcType.ELITE2]]) {
        const queries = buildLootStatsQueries(boundary.database, {
          guildId: "stats-a",
          dateFrom: new Date("2026-01-01T00:00:00Z"),
          world: "test",
          npcTypes,
          visibility,
          truncUnit: "day",
        });

        const result = await boundary.run(Effect.all(queries));
        expect(result.overview).toEqual([
          {
            total_loots: 1,
            total_items: 3,
            legendary_items: 2,
            heroic_items: 1,
            avg_item_level: "100.0000000000000000",
          },
        ]);
        expect(result.byRarity).toEqual(
          expect.arrayContaining([
            { rarity: "LEGENDARY", count: 2 },
            { rarity: "HEROIC", count: 1 },
          ]),
        );
        expect(result.timeline).toHaveLength(2);
        expect(
          result.timeline.every(
            (row) => row.date.toISOString() === "2026-01-01T00:00:00.000Z",
          ),
        ).toBe(true);
        expect(result.topNpcs).toEqual([
          {
            npc_id: 100,
            name: "Hero",
            type: "HERO",
            lvl: 100,
            icon: null,
            count: 3,
            legendary: 2,
            heroic: 1,
          },
        ]);
        expect(result.topContributors).toEqual([
          {
            member_id: 1,
            name: "Reader A",
            avatar: null,
            user_id: "reader-a",
            count: 1,
            legendary: 1,
            heroic: 1,
            unique: 0,
            upgraded: 0,
          },
        ]);
        expect(result.topItems).toEqual([
          {
            item_id: 101,
            hid: "legendary-a",
            name: "Legendary",
            icon: "l.gif",
            rarity: "LEGENDARY",
            lvl: 100,
            count: 2,
          },
        ]);
      }
    } finally {
      await boundary.dispose();
    }
  });
});
