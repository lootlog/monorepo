import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { Effect, ManagedRuntime } from "effect";
import { relations } from "#src/database/relations";
import { battles, battleWarriors, userCharacters } from "#src/database/schema";
import { makeBattleListFilter } from "./battle-list-filter.service.js";
import type { BattleListQuery } from "./query-battles.js";

const runtime = ManagedRuntime.make(PgliteClient.layer({}));

const databaseEffect = makeWithDefaults({ relations });

let database: Effect.Success<typeof databaseEffect>;

const fixtures = [
  { id: "win", characterId: "hero", team: 1, winningTeam: 1, losingTeam: 2 },
  { id: "loss", characterId: "alt", team: 2, winningTeam: 1, losingTeam: 2 },
  {
    id: "mixed",
    characterId: "hero",
    team: 1,
    winningTeam: 2,
    losingTeam: 1,
    opponentId: "alt",
  },
  {
    id: "flee",
    characterId: "hero",
    team: 1,
    winningTeam: 2,
    losingTeam: 1,
    hasFlee: true,
  },
  { id: "draw", characterId: "hero", team: 1, winningTeam: 0, losingTeam: 0 },
  {
    id: "invalid-team",
    characterId: "hero",
    team: 3,
    winningTeam: 3,
    losingTeam: 0,
  },
  {
    id: "other-owner",
    characterId: "hero",
    team: 1,
    winningTeam: 1,
    losingTeam: 2,
    userId: "other-owner",
  },
  {
    id: "other-recorder",
    characterId: "outsider",
    team: 1,
    winningTeam: 1,
    losingTeam: 2,
    opponentId: "hero",
  },
];

beforeAll(async () => {
  database = await runtime.runPromise(databaseEffect);
  await runtime.runPromise(
    migrate(database, {
      migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname,
    }),
  );
  await runtime.runPromise(
    database.insert(userCharacters).values(
      ["hero", "alt"].map((characterId) => ({
        userId: "owner",
        characterId,
        name: characterId,
        world: "world",
      })),
    ),
  );

  for (const fixture of fixtures) {
    await runtime.runPromise(
      database.insert(battles).values({
        id: fixture.id,
        userId: fixture.userId ?? "owner",
        accountId: "account",
        characterId: fixture.characterId,
        world: "world",
        duration: 10,
        type: "1v1",
        winner: "Winner",
        loser: "Loser",
        winningTeam: fixture.winningTeam,
        losingTeam: fixture.losingTeam,
        hasFlee: fixture.hasFlee ?? false,
        statistics: {},
      }),
    );
    await runtime.runPromise(
      database.insert(battleWarriors).values([
        {
          battleId: fixture.id,
          originalId: fixture.characterId,
          name: fixture.characterId,
          lvl: 100,
          prof: "w",
          icon: "hero.gif",
          team: fixture.team,
          turns: 1,
          ph: 10,
        },
        {
          battleId: fixture.id,
          originalId: fixture.opponentId ?? "enemy",
          name: fixture.opponentId ?? "enemy",
          lvl: 200,
          prof: "m",
          icon: "enemy.gif",
          team: fixture.team === 1 ? 2 : 1,
          turns: 1,
          ph: 0,
        },
      ]),
    );
  }
}, 60_000);

afterAll(() => runtime.dispose());

const list = (filters: Partial<BattleListQuery>, userId = "owner") =>
  runtime.runPromise(
    Effect.gen(function* () {
      const filter = yield* makeBattleListFilter(
        database,
      ).buildFilterConditions(
        {
          size: 20,
          sortOrder: "asc",
          includeTotal: false,
          userId,
          ...filters,
        },
        userId,
      );

      const rows = yield* database
        .select({ id: battles.id })
        .from(battles)
        .where(filter(battles))
        .orderBy(battles.id);

      return rows.map((row) => row.id);
    }),
  );

describe("battle list filters against PostgreSQL", () => {
  it("matches any selected character's result while keeping recorder and owner visibility", async () => {
    expect(
      await list({ characterId: ["hero", "alt"], result: ["won"] }),
    ).toEqual(["mixed", "win"]);
    expect(
      await list({ characterId: ["hero", "alt"], result: ["lost"] }),
    ).toEqual(["loss", "mixed"]);
    expect(await list({ characterId: ["hero"], result: ["won"] })).toEqual([
      "win",
    ]);
    expect(await list({ characterId: ["hero"], result: ["lost"] })).toEqual([
      "mixed",
    ]);
  });

  it("keeps flee separate from team results and excludes draws and invalid winning teams", async () => {
    expect(await list({ result: ["won", "lost"] })).toEqual([
      "loss",
      "mixed",
      "win",
    ]);
    expect(await list({ result: ["flee"] })).toEqual(["flee"]);
    expect(await list({ result: ["won", "flee"] })).toEqual([
      "flee",
      "mixed",
      "win",
    ]);
  });

  it("uses selected characters for PH and excludes them from opponent level matching", async () => {
    expect(
      await list({
        characterId: ["hero", "alt"],
        result: ["won"],
        ph: true,
        minLevel: 180,
        maxLevel: 220,
      }),
    ).toEqual(["win"]);
    expect(
      await list({ characterId: ["alt"], result: ["won"], ph: true }),
    ).toEqual([]);
  });
});
