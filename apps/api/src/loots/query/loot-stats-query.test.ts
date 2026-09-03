import { describe, expect, it } from "#test/bun-test";
import { Effect } from "effect";
import {
  LootStatsQueryError,
  makeLootStatsQuery,
} from "#src/loots/query/loot-stats-query";

describe("makeLootStatsQuery", () => {
  it("forwards the statement and a copy of its parameters", async () => {
    const rows = [{ count: 3 }];
    const calls: Array<{
      statement: string;
      parameters: ReadonlyArray<unknown>;
    }> = [];
    const query = makeLootStatsQuery({
      unsafe: <Row extends Record<string, unknown>>(
        statement: string,
        parameters: ReadonlyArray<unknown>,
      ) => {
        calls.push({ statement, parameters });
        return Effect.succeed(rows as unknown as Row[]);
      },
    });
    const parameters = [1] as const;

    await expect(
      Effect.runPromise(query("loot-stats.test", "SELECT $1", parameters)),
    ).resolves.toEqual(rows);
    expect(calls).toEqual([{ statement: "SELECT $1", parameters: [1] }]);
    expect(calls[0]?.parameters).not.toBe(parameters);
  });

  it("maps database failures to an operation-specific error", async () => {
    const cause = new Error("database unavailable");
    const query = makeLootStatsQuery({
      unsafe: <Row extends Record<string, unknown>>() =>
        Effect.fail<Error>(cause),
    });

    const error = await Effect.runPromise(
      Effect.flip(query("loot-stats.read", "SELECT 1", [])),
    );

    expect(error).toBeInstanceOf(LootStatsQueryError);
    expect(error).toMatchObject({
      _tag: "LootStatsQueryError",
      operation: "loot-stats.read",
      cause,
    });
  });
});
