import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  guildTable,
  lootTable,
  organizationLootRecordTable,
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
  });
});
