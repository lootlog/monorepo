import { describe, expect, it } from "#test/bun-test";
import { Effect } from "effect";
import { makeLootStatsQuery } from "./loot-stats-query.js";

describe("makeLootStatsQuery", () => {
  it("unwraps rows from the raw PostgreSQL query result", async () => {
    const rows = [{ count: 3 }];
    const query = makeLootStatsQuery({
      unsafe: <Row extends Record<string, unknown>>() =>
        Effect.succeed(rows as unknown as Row[]),
    });

    await expect(
      Effect.runPromise(query("loot-stats.test", "SELECT $1", [1])),
    ).resolves.toEqual(rows);
  });
});
