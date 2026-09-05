import { describe, expect, it } from "bun:test";
import * as PgClient from "@effect/sql-pg/PgClient";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Effect } from "effect";
import { makeEventTimerStore } from "./event-timer.store.js";

describe("event timer name lookup", () => {
  it.each([
    { names: ["Anielska zabójczyni"] },
    { names: ["Anielska zabójczyni", "O'Connor, {hero}"] },
  ])("binds hero names as individual text values (%j)", async ({ names }) => {
    const statements: { sql: string; params: unknown[] }[] = [];
    const client = {
      unsafe: (sql: string, params: unknown[]) => ({
        values: Effect.sync(() => {
          statements.push({ sql, params });
          return [];
        }),
      }),
    } as unknown as PgClient.PgClient;
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const database = yield* makeWithDefaults();
        return yield* makeEventTimerStore(database).findEventHeroTimersByNames(
          "guild-a",
          "Aldous",
          [...names],
        );
      }).pipe(Effect.provideService(PgClient.PgClient, client)),
    );
    expect(result).toEqual([]);
    expect(statements).toHaveLength(1);
    expect(statements[0]?.params).toEqual(["guild-a", "Aldous", ...names]);
    expect(statements[0]?.sql).toContain("->>'name' in (");
    expect(statements[0]?.sql).not.toContain("::text[]");
  });
});
