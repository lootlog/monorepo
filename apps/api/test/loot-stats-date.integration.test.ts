import { describe, expect, it } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import { Effect } from "effect";
import { sql } from "drizzle-orm";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  guildTable,
  itemSnapshotTable,
  lootItemTable,
  lootTable,
  organizationLootRecordTable,
} from "../src/database/drizzle/schema.js";
import { buildLootStatsQueries } from "../src/loots/query/loot-stats-query.js";
import { requireIsolatedTestDatabase } from "./isolated-test-database.js";

describe("loot statistics date parameter compatibility", () => {
  for (const timezone of ["UTC", "Europe/Warsaw"]) {
    it(`preserves the legacy Date cutoff in ${timezone}`, async () => {
      requireIsolatedTestDatabase();
      const rollback = new Error("Rollback date compatibility fixture");
      await Effect.gen(function* () {
        const database = yield* ApiDatabase;
        const postgres = yield* PgClient.PgClient;
        yield* database
          .transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.execute(
                sql`select set_config('TimeZone', ${timezone}, true)`,
              );
              const guildId = crypto.randomUUID();
              yield* transaction.insert(guildTable).values({
                id: guildId,
                name: "Date boundary",
                ownerId: guildId,
                updatedAt: new Date(),
              });

              const [loot] = yield* transaction
                .insert(lootTable)
                .values({
                  uniqueId: crypto.randomUUID(),
                  world: "date-boundary",
                  source: "FIGHT",
                  location: "Test",
                  createdAt: sql`timestamp '2026-01-01 00:30:00'`,
                  updatedAt: new Date(),
                })
                .returning();

              const [item] = yield* transaction
                .insert(itemSnapshotTable)
                .values({
                  itemId: 1,
                  statsHash: crypto.randomUUID(),
                  name: "Item",
                  icon: "item.gif",
                  lvl: 100,
                  rarity: "LEGENDARY",
                  itemType: "WEAPON",
                  statRaw: "",
                  statsSnapshot: {},
                })
                .returning();

              if (!loot || !item) throw new Error("Missing date fixture");
              yield* transaction
                .insert(organizationLootRecordTable)
                .values({ guildId, lootId: loot.id, updatedAt: new Date() });
              yield* transaction.insert(lootItemTable).values({
                lootId: loot.id,
                itemSnapshotId: item.id,
                hid: crypto.randomUUID(),
              });
              const cutoff = new Date("2026-01-01T00:00:00Z");

              const legacy = yield* postgres.unsafe<{ count: number }>(
                `select count(*)::int as count from "Loot" where id=$1 and "createdAt">=$2`,
                [loot.id, cutoff],
              );

              const queries = buildLootStatsQueries(transaction, {
                guildId,
                dateFrom: cutoff,
                truncUnit: "day",
              });

              const current = yield* queries.overview;
              const scopedTimeline = yield* queries.timeline;

              const timeline = yield* buildLootStatsQueries(transaction, {
                guildId,
                dateFrom: null,
                truncUnit: "day",
              }).timeline;

              const expected = timezone === "UTC" ? 1 : 0;
              expect(legacy[0]?.count).toBe(expected);
              expect(current[0]?.total_loots).toBe(expected);
              expect(scopedTimeline).toHaveLength(expected);
              expect(timeline[0]?.date).toBeInstanceOf(Date);
              expect(timeline[0]?.date.toISOString()).toBe(
                "2026-01-01T00:00:00.000Z",
              );

              return yield* Effect.fail(rollback);
            }),
          )
          .pipe(
            Effect.catch((error) =>
              error === rollback ? Effect.void : Effect.fail(error),
            ),
          );
      }).pipe(Effect.provide(ApiDatabaseLive), Effect.runPromise);
    });
  }
});
