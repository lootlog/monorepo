import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootNpcTable,
  lootTable,
  npcSnapshotTable,
  organizationLootRecordTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  LootResponse,
  NullableLootResponse,
} from "#src/loots/loot-response.schema";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";

describe("historical loot allocations", () => {
  it("returns repaired historical allocations in lists, details and visible summaries without losing valid allocations", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      // Recreate the pre-constraint storage state in this isolated database.
      await run(
        database.$client.unsafe(
          'ALTER TABLE "Loot" DROP CONSTRAINT "Loot_lootShare_object_check"',
        ),
      );
      const now = new Date("2026-09-14T00:00:00Z");

      const [guild] = await run(
        database
          .insert(guildTable)
          .values({
            id: "legacy-loot",
            name: "Test",
            ownerId: "owner",
            updatedAt: now,
          })
          .returning(),
      );

      if (!guild) throw new Error("Expected Organization");
      const assigned = { Player: ["item-1", "item-2"] };
      const allocations = [[], {}, assigned];

      const records = await run(
        database
          .insert(lootTable)
          .values(
            allocations.map((lootShare, index) => ({
              uniqueId: `legacy-${index}`,
              world: "test",
              source: "FIGHT" as const,
              location: "Test location",
              updatedAt: now,
              lootShare,
            })),
          )
          .returning(),
      );

      await run(
        database.insert(organizationLootRecordTable).values(
          records.map(({ id }) => ({
            lootId: id,
            guildId: guild.id,
            updatedAt: now,
          })),
        ),
      );

      const repair = await Bun.file(
        new URL(
          "../../../drizzle/migrations/20260916073356_loot_share_object_constraint/migration.sql",
          import.meta.url,
        ),
      ).text();

      await run(
        database.$client.withTransaction(
          Effect.gen(function* () {
            for (const statement of repair.split("--> statement-breakpoint")) {
              yield* database.$client.unsafe(statement);
            }
          }),
        ),
      );

      const persistence = makeLootQueryPersistence(database);
      const query = makeLootQueryOperations(persistence);

      const list = Schema.encodeSync(Schema.Array(LootResponse))(
        await run(query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {})),
      );

      expect(list).toHaveLength(3);

      const summaries = await run(
        persistence.readVisibleSummaries(records.map(({ id }) => id)),
      );

      for (const [index, record] of records.entries()) {
        const expected = index === 2 ? assigned : {};
        expect(list.find(({ id }) => id === record.id)?.lootShare).toEqual(
          expected,
        );

        const detail = Schema.encodeSync(NullableLootResponse)(
          await run(
            query.fetchLootById(guild, [Permission.OWNER], [], record.id),
          ),
        );

        expect(detail?.lootShare).toEqual(expected);
        expect(summaries.get(record.id)?.lootShare).toEqual(expected);
      }

      expect(
        await run(
          database
            .select({ lootShare: lootTable.lootShare })
            .from(lootTable)
            .orderBy(lootTable.id),
        ),
      ).toEqual([{}, {}, assigned].map((lootShare) => ({ lootShare })));
      expect(
        await run(
          query.fetchLootsByGuildId(
            { ...guild, id: "unrelated" },
            [Permission.OWNER],
            [],
            {},
          ),
        ),
      ).toEqual([]);
      const historical = records[0];

      if (!historical) throw new Error("Expected historical loot");
      expect(
        await run(
          query.fetchLootById(
            { ...guild, id: "unrelated" },
            [Permission.OWNER],
            [],
            historical.id,
          ),
        ),
      ).toBeNull();
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});

describe("filtered loot reads", () => {
  it("preserves independent relation matches, visibility and pagination across lists, counts and details", async () => {
    const boundary = await createDatabaseBoundary();

    try {
      const { database, run } = boundary;
      const now = new Date("2026-09-16T00:00:00Z");

      const [guild] = await run(
        database
          .insert(guildTable)
          .values([
            {
              id: "filtered",
              name: "Filtered",
              ownerId: "owner",
              updatedAt: now,
            },
            {
              id: "foreign",
              name: "Foreign",
              ownerId: "owner",
              updatedAt: now,
            },
          ])
          .returning(),
      );

      if (!guild) throw new Error("Expected Organization");

      const roles = await run(
        database
          .insert(roleTable)
          .values([
            {
              id: "low-common",
              guildId: guild.id,
              name: "Low common",
              permissions: [Permission.LOOTLOG_LOOTS_READ],
              lvlRangeFrom: 0,
              lvlRangeTo: 100,
              updatedAt: now,
            },
            {
              id: "high-hero",
              guildId: guild.id,
              name: "High hero",
              permissions: [
                Permission.LOOTLOG_LOOTS_READ,
                Permission.LOOTLOG_LOOTS_HEROES_READ,
              ],
              lvlRangeFrom: 200,
              lvlRangeTo: 300,
              updatedAt: now,
            },
          ])
          .returning(),
      );

      await run(
        database.insert(npcSnapshotTable).values([
          { id: 1, npcId: 1, name: "Named common", type: "COMMON", lvl: 50 },
          { id: 2, npcId: 2, name: "High hero", type: "HERO", lvl: 250 },
          { id: 3, npcId: 3, name: "Low hero", type: "HERO", lvl: 50 },
          { id: 4, npcId: 4, name: "Unknown type", type: null, lvl: 50 },
          { id: 5, npcId: 5, name: "Unknown level", type: "COMMON", lvl: null },
          { id: 6, npcId: 6, name: "Named common", type: "COMMON", lvl: 75 },
        ]),
      );
      await run(
        database.insert(itemSnapshotTable).values([
          {
            id: 1,
            itemId: 1,
            statsHash: "low",
            name: "Named item",
            icon: "",
            lvl: 50,
            rarity: "LEGENDARY",
            statRaw: "",
            statsSnapshot: {},
          },
          {
            id: 2,
            itemId: 2,
            statsHash: "high",
            name: "High item",
            icon: "",
            lvl: 250,
            rarity: "UNIQUE",
            statRaw: "",
            statsSnapshot: {},
          },
        ]),
      );
      // Only 1 and 2 are readable with these roles. Higher IDs exercise
      // filtering before LIMIT, including records outside this Organization.
      await run(
        database.insert(lootTable).values(
          Array.from({ length: 8 }, (_, index) => ({
            id: index + 1,
            uniqueId: `filtered-${index + 1}`,
            world: "test",
            source: "FIGHT" as const,
            location: "Test location",
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(organizationLootRecordTable).values(
          Array.from({ length: 8 }, (_, index) => ({
            lootId: index + 1,
            guildId: index === 6 ? "foreign" : guild.id,
            archivedAt: index === 7 ? now : null,
            updatedAt: now,
          })),
        ),
      );
      await run(
        database.insert(lootNpcTable).values([
          ...[1, 2, 3, 4, 5, 7, 8].flatMap((lootId) => [
            { lootId, npcSnapshotId: lootId === 2 ? 6 : 1 },
            { lootId, npcSnapshotId: 2 },
          ]),
          { lootId: 2, npcSnapshotId: 2 },
          { lootId: 3, npcSnapshotId: 3 },
          { lootId: 4, npcSnapshotId: 4 },
          { lootId: 5, npcSnapshotId: 5 },
        ]),
      );
      await run(
        database.insert(lootItemTable).values(
          Array.from({ length: 8 }, (_, index) => index + 1).flatMap(
            (lootId) => [
              { lootId, itemSnapshotId: 1, hid: "named-hid" },
              { lootId, itemSnapshotId: 1, hid: "duplicate-match" },
              { lootId, itemSnapshotId: 2, hid: "high-hid" },
            ],
          ),
        ),
      );
      const query = makeLootQueryOperations(makeLootQueryPersistence(database));

      const filters = {
        npcs: ["Named common"],
        npcTypes: ["HERO"],
        npcLevelMin: 200,
        itemNames: [" Named item ", "Named item"],
        rarities: ["LEGENDARY"],
        itemLevelMin: 200,
        hid: "high-hid",
        world: "test",
      } satisfies Parameters<typeof query.fetchLootsByGuildId>[3];

      const permissions = [Permission.LOOTLOG_LOOTS_READ];

      const list = await run(
        query.fetchLootsByGuildId(guild, permissions, roles, filters),
      );

      expect(list.map(({ id }) => id)).toEqual([2, 1]);

      for (const { npcs, expectedIds } of [
        { npcs: [], expectedIds: [6, 5, 4, 3, 2, 1] },
        { npcs: ["Missing NPC"], expectedIds: [] },
        { npcs: ["Missing NPC", "Named common"], expectedIds: [5, 4, 3, 2, 1] },
      ]) {
        expect(
          (
            await run(
              query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {
                npcs,
              }),
            )
          ).map(({ id }) => id),
        ).toEqual(expectedIds);
        expect(
          await run(
            query.countLootsByGuildId(guild, [Permission.OWNER], [], { npcs }),
          ),
        ).toBe(expectedIds.length);
      }

      expect(
        await run(
          query.countLootsByGuildId(guild, permissions, roles, filters),
        ),
      ).toBe(2);
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, permissions, roles, {
              ...filters,
              limit: 1,
            }),
          )
        ).map(({ id }) => id),
      ).toEqual([2]);
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, permissions, roles, {
              ...filters,
              cursor: 2,
              limit: 1,
            }),
          )
        ).map(({ id }) => id),
      ).toEqual([1]);
      expect(
        await run(
          query.countLootsByGuildId(guild, permissions, roles, {
            ...filters,
            cursor: 2,
            limit: 1,
          }),
        ),
      ).toBe(2);

      // A role granting heroes at high levels cannot authorize a low hero;
      // null metadata and empty encounters must also fail closed.
      for (const lootId of [3, 4, 5, 6, 7, 8]) {
        expect(
          await run(query.fetchLootById(guild, permissions, roles, lootId)),
        ).toBeNull();
      }

      expect(
        (await run(query.fetchLootById(guild, permissions, roles, 2)))?.id,
      ).toBe(2);
      expect(
        await run(query.countLootsByGuildId(guild, permissions, roles, {})),
      ).toBe(2);
      expect(
        await run(
          query.fetchLootsByGuildId(
            guild,
            permissions,
            roles.slice(0, 1),
            filters,
          ),
        ),
      ).toEqual([]);
      expect(
        await run(query.fetchLootsByGuildId(guild, permissions, [], filters)),
      ).toEqual([]);

      // OWNER bypasses NPC restrictions, but never Organization isolation or archive state.
      expect(
        (
          await run(
            query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {}),
          )
        ).map(({ id }) => id),
      ).toEqual([6, 5, 4, 3, 2, 1]);
      expect(
        await run(
          query.countLootsByGuildId(guild, [Permission.OWNER], [], filters),
        ),
      ).toBe(5);

      for (const lootId of [7, 8]) {
        expect(
          await run(query.fetchLootById(guild, [Permission.OWNER], [], lootId)),
        ).toBeNull();
      }

      expect(
        await run(
          query.fetchLootsByGuildId(guild, [Permission.OWNER], [], {
            itemNames: ["Missing item"],
          }),
        ),
      ).toEqual([]);
      expect(
        await run(
          query.countLootsByGuildId(guild, [Permission.OWNER], [], {
            itemNames: ["Missing item"],
          }),
        ),
      ).toBe(0);
    } finally {
      await boundary.dispose();
    }
  }, 15_000);
});
