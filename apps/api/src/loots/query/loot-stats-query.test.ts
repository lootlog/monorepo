import { describe, expect, it } from "bun:test";
import { Effect, Predicate } from "effect";
import { createDatabaseBoundary } from "../../../test/database-fixtures.js";
import {
  LootStatsQueryError,
  makeLootStatsQuery,
} from "#src/loots/query/loot-stats-query";

describe("makeLootStatsQuery", () => {
  it("binds input as a value instead of executing SQL text", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const query = makeLootStatsQuery(boundary.database.$client);
      const value = "O'Connor; SELECT 42";
      expect(
        await boundary.run(
          query("loot-stats.test", "SELECT $1::text AS value", [value]),
        ),
      ).toEqual([{ value }]);
    } finally {
      await boundary.dispose();
    }
  });

  it("maps database failures to an operation-specific error", async () => {
    const boundary = await createDatabaseBoundary();
    try {
      const query = makeLootStatsQuery(boundary.database.$client);
      const error = await boundary.run(
        Effect.flip(query("loot-stats.read", "SELECT missing_column", [])),
      );
      expect(error).toBeInstanceOf(LootStatsQueryError);
      expect(error).toMatchObject({ operation: "loot-stats.read" });
      expect(Predicate.isTagged("SqlError")(error.cause)).toBe(true);
    } finally {
      await boundary.dispose();
    }
  });
});
