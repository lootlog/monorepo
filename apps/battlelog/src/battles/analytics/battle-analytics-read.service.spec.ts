import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { Effect, ManagedRuntime } from "effect";
import { relations } from "#src/database/relations";
import { battles, battleWarriors, userCharacters } from "#src/database/schema";
import { createBattleId } from "#src/battles/battle-id";
import { unusedRedisStore } from "../../../test/battle-fixtures.js";
import { makeBattleAnalyticsCache } from "./battle-analytics-cache.service.js";
import { makeBattleAnalyticsQuery } from "./battle-analytics-query.service.js";
import { makeBattleAnalyticsRead } from "./battle-analytics-read.service.js";
import { makeBattleCombatProfileRead } from "./battle-combat-profile-read.service.js";
import { makeBattleAnalytics } from "./battle-analytics.service.js";
import type { BattleStatisticsQuery } from "./query-battle-statistics.js";
import {
  legacyBattleAnalytics as legacy,
  type BattleWithWarriors,
} from "../../../test/legacy-battle-analytics.js";
import { sortBy } from "es-toolkit";

const runtime = ManagedRuntime.make(PgliteClient.layer({}));

const dbEffect = makeWithDefaults({ relations });

let db: Effect.Success<typeof dbEffect>;

let reads: ReturnType<typeof makeBattleAnalyticsRead>;

let service: ReturnType<typeof makeBattleAnalytics>;

let fullHistory: BattleWithWarriors[];

const namedBattleIds = new Map<string, string>();

// A battle ID carries its createdAt; fixtures name battles for readable assertions.
const namedBattle = (name: string, createdAt: Date) => {
  const battle = createBattleId(createdAt.getTime());
  namedBattleIds.set(name, battle.id);

  return battle;
};

const idOf = (name: string) => namedBattleIds.get(name);

const characters = ["hero-1", "hero-2"];

const characterSet = new Set(characters);

const cachedValues = new Map<string, string>();

const query = (
  overrides: Partial<BattleStatisticsQuery> = {},
): BattleStatisticsQuery => ({
  size: 20,
  includeTotal: false,
  sortBy: "totalBattles",
  sortOrder: "desc",
  ...overrides,
});

const legacyHistory = (
  filters: BattleStatisticsQuery,
  options: {
    hasFlee?: boolean;
    ph?: boolean;
    rating?: boolean;
    ratingDelta?: boolean;
  } = {},
) =>
  legacy.filterByOpponentLevel(
    fullHistory.filter(
      (battle) =>
        battle.type === "1v1" &&
        (!filters.world || battle.world === filters.world) &&
        (!filters.startDate ||
          battle.createdAt >= new Date(filters.startDate)) &&
        (!filters.endDate || battle.createdAt <= new Date(filters.endDate)) &&
        (filters.matchmaking === undefined ||
          battle.matchmaking === filters.matchmaking) &&
        (options.hasFlee === undefined || battle.hasFlee === options.hasFlee) &&
        (!options.rating || battle.rating !== null) &&
        (!options.ratingDelta || battle.ratingDelta !== null) &&
        battle.warriors.some(
          (warrior) =>
            characterSet.has(warrior.originalId) &&
            (!(options.ph ?? filters.ph) || warrior.ph > 0),
        ),
    ),
    characterSet,
    filters.minLevel,
    filters.maxLevel,
  );

beforeAll(async () => {
  db = await runtime.runPromise(dbEffect);
  await runtime.runPromise(
    migrate(db, {
      migrationsFolder: new URL("../../../drizzle", import.meta.url).pathname,
    }),
  );

  const cache = makeBattleAnalyticsCache({
    ...unusedRedisStore,
    eval: mock().mockResolvedValue("generation"),
    getOrSetJsonBestEffort: async ({ key, factory, codec }) => {
      const cached = cachedValues.get(key);

      if (cached !== undefined) return codec.parse(cached);
      const value = await factory();
      cachedValues.set(key, codec.stringify(value));

      return value;
    },
  });

  const queryModule = makeBattleAnalyticsQuery(db);
  reads = makeBattleAnalyticsRead(db, queryModule);
  service = makeBattleAnalytics(
    reads,
    makeBattleCombatProfileRead(db, queryModule),
    cache,
    queryModule,
    (effect) => effect,
  );
  await runtime.runPromise(
    db.insert(userCharacters).values(
      characters.map((characterId) => ({
        userId: "owner",
        characterId,
        world: "alpha",
        name: characterId,
      })),
    ),
  );

  for (let index = 0; index < 14; index++) {
    const { id, createdAt } = namedBattle(
      `battle-${String(index).padStart(2, "0")}`,
      new Date(Date.UTC(2024, index < 8 ? 0 : 2, index + 1)),
    );

    const characterId = characters[index % 2];
    const owner = index === 13 ? "foreign" : "owner";
    const isLoss = index % 3 === 0;
    await runtime.runPromise(
      db.insert(battles).values({
        id,
        userId: owner,
        accountId: "account",
        characterId,
        world: index === 10 ? "beta" : "alpha",
        createdAt,
        type: index === 11 ? "group" : "1v1",
        duration: 100 + index * 13,
        winner: isLoss ? "Opponent" : "Hero",
        loser: isLoss ? "Hero" : "Opponent",
        winningTeam: isLoss ? 2 : 1,
        losingTeam: index === 6 ? 3 : isLoss ? 1 : 2,
        hasFlee: index === 4,
        matchmaking: index !== 2,
        rating: index === 1 ? null : 1400 + index * 10,
        ratingDelta: index === 3 ? null : index % 4 === 0 ? 0 : index - 5,
        pointsGained: index % 3 === 0 ? null : index,
      }),
    );
    await runtime.runPromise(
      db.insert(battleWarriors).values({
        battleId: id,
        originalId: characterId,
        name: "Hero",
        icon: "hero.png",
        lvl: 100,
        prof: "w",
        team: 1,
        turns: 10,
        ph: index % 3 === 0 ? 0 : 5,
        fireDamage: 20 + index,
        woundDamageTaken: 3,
      }),
    );

    if (index !== 12)
      await runtime.runPromise(
        db.insert(battleWarriors).values({
          battleId: id,
          originalId: `opponent-${index % 3}`,
          name: `Opponent ${index}`,
          icon: `${index}.png`,
          lvl: 90 + index,
          prof: index % 2 === 0 ? "m" : "p",
          team: 2,
          turns: 8,
          frostDamage: index === 8 ? 17 : 30 + index,
          fireDamage: index === 8 ? 99 : 0,
        }),
      );
  }

  fullHistory = await runtime.runPromise(
    db.query.battles.findMany({
      where: { userId: "owner" },
      with: { warriors: true },
      orderBy: { createdAt: "asc", id: "asc" },
    }),
  );
}, 60_000);

afterAll(() => runtime.dispose());

describe("SQL battle analytics parity", () => {
  const filters = [
    query(),
    query({ world: "alpha", matchmaking: false }),
    query({ minLevel: 93, maxLevel: 99 }),
    query({
      ph: true,
      matchmaking: true,
      startDate: "2024-01-03T00:00:00.000Z",
      endDate: "2024-03-10T00:00:00.000Z",
    }),
    query({ minLevel: 300 }),
  ];

  for (const [index, filtersQuery] of filters.entries()) {
    it(`preserves streak, durations and per-battle series for filter set ${index}`, async () => {
      const resolved = legacyHistory(filtersQuery, { hasFlee: false });
      expect(
        await runtime.runPromise(
          reads.getStreak("owner", filtersQuery, characters),
        ),
      ).toEqual(legacy.currentStreak(resolved.slice().reverse(), characterSet));
      expect(
        await runtime.runPromise(
          reads.getDuration("owner", filtersQuery, characters),
        ),
      ).toEqual(
        legacy.durationStats(
          resolved
            .slice()
            .sort((left, right) => left.duration - right.duration),
          characterSet,
        ),
      );
      expect(
        await runtime.runPromise(
          reads.getPhGrowth("owner", filtersQuery, characters),
        ),
      ).toEqual(
        legacy.phGrowth(
          legacyHistory(filtersQuery, { ph: true }),
          characterSet,
        ),
      );
      expect(
        await runtime.runPromise(
          reads.getRatingGrowth("owner", filtersQuery, characters),
        ),
      ).toEqual(
        legacy.ratingGrowth(
          legacyHistory(
            { ...filtersQuery, matchmaking: true },
            { rating: true, ratingDelta: true },
          ),
        ),
      );
    });
    it(`preserves opponent aggregates, latest snapshots and packed fallback for filter set ${index}`, async () => {
      const h2hQuery = { ...filtersQuery, matchmaking: true };
      expect(
        sortBy(
          await runtime.runPromise(
            reads.getHeadToHead("owner", h2hQuery, characters),
          ),
          ["opponentId"],
        ),
      ).toEqual(
        sortBy(
          legacy.headToHeadRecords(
            legacyHistory(h2hQuery, { hasFlee: false }).slice().reverse(),
            characterSet,
            h2hQuery.matchmaking,
          ),
          ["opponentId"],
        ),
      );
      expect(
        await runtime.runPromise(
          reads.getRatingByOpponent("owner", filtersQuery, characters),
        ),
      ).toEqual(
        legacy.ratingDeltaByOpponent(
          legacyHistory(
            { ...filtersQuery, matchmaking: true },
            { hasFlee: false, ratingDelta: true },
          )
            .slice()
            .reverse(),
          characterSet,
        ),
      );
    });
  }

  it("discovers seasons across gaps without dropping group battles, worlds, null points or flees", async () => {
    expect(
      await runtime.runPromise(reads.getSeasons("owner", characters)),
    ).toEqual(
      legacy.seasons(
        fullHistory.filter((battle) => battle.matchmaking),
        characterSet,
      ),
    );
  });

  it("filters PvP in SQL, preserves self-opponent lookup and fetches details only for requested page", async () => {
    for (const opponentId of ["opponent-2", "hero-1", "absent"]) {
      const pvpQuery = {
        ...query({ minLevel: 90, maxLevel: 101 }),
        opponentId,
        excludeBattleId: idOf("battle-02"),
      };

      const expected = legacy.playerVsPlayerBattles(
        legacyHistory(pvpQuery).slice().reverse(),
        characterSet,
        pvpQuery,
      );

      const total = await runtime.runPromise(
        reads.getPlayerVsPlayerCount("owner", pvpQuery, characters),
      );

      expect(total).toBe(expected.length);
      expect(
        await runtime.runPromise(
          reads.getPlayerVsPlayerPage("owner", pvpQuery, characters, {
            offset: 1,
            size: 1,
          }),
        ),
      ).toEqual(expected.slice(1, 2));
    }
  });

  it("shares cached opponent aggregates and PvP counts across forward and backward pagination", async () => {
    cachedValues.clear();
    const filtersQuery = query({ size: 1, includeTotal: true });

    const first = await runtime.runPromise(
      service.getHeadToHead(filtersQuery, "owner"),
    );

    const afterFirst = cachedValues.size;

    const next = await runtime.runPromise(
      service.getHeadToHead(
        { ...filtersQuery, cursor: first.pagination.nextCursor },
        "owner",
      ),
    );

    expect(cachedValues.size).toBe(afterFirst);
    expect(next.records[0]?.opponentId).not.toBe(first.records[0]?.opponentId);
    expect(
      (
        await runtime.runPromise(
          service.getHeadToHead(
            { ...filtersQuery, cursor: next.pagination.previousCursor },
            "owner",
          ),
        )
      ).records,
    ).toEqual(first.records);
    const pvpQuery = { ...filtersQuery, opponentId: "opponent-1" };

    const pvpFirst = await runtime.runPromise(
      service.getPlayerVsPlayerBattles(pvpQuery, "owner"),
    );

    const beforePageTwo = cachedValues.size;

    const pvpNext = await runtime.runPromise(
      service.getPlayerVsPlayerBattles(
        { ...pvpQuery, cursor: pvpFirst.pagination.nextCursor },
        "owner",
      ),
    );

    expect(cachedValues.size).toBe(beforePageTwo);
    expect(pvpNext.battles[0]?.battleId).not.toBe(
      pvpFirst.battles[0]?.battleId,
    );
    expect(
      (
        await runtime.runPromise(
          service.getPlayerVsPlayerBattles(
            { ...pvpQuery, cursor: pvpNext.pagination.previousCursor },
            "owner",
          ),
        )
      ).battles,
    ).toEqual(pvpFirst.battles);
  });
});

it("folds combat history across tied-date batches without losing team matchups or visibility", async () => {
  const battleRows = Array.from({ length: 264 }, (_, index) => ({
    ...createBattleId(Date.UTC(2025, 0, 1)),
    userId: index === 263 ? "foreign" : "owner",
    accountId: "account",
    characterId: "hero-1",
    world: "combat-test",
    type: "group",
    duration: 100 + index,
    winner: "Winner",
    loser: "Loser",
    winningTeam: index === 260 ? 0 : index % 2 === 0 ? 1 : 2,
    losingTeam: index === 260 ? 0 : index % 2 === 0 ? 2 : 1,
    hasFlee: index === 261,
    ratingDelta: index % 2 === 0 ? 5 : -4,
  }));

  await runtime.runPromise(db.insert(battles).values(battleRows));
  await runtime.runPromise(
    db.insert(battleWarriors).values(
      battleRows.flatMap((battle, index) => [
        {
          battleId: battle.id,
          originalId: "hero-1",
          name: "Hero",
          icon: "hero.gif",
          lvl: 100,
          prof: "w",
          team: 1,
          turns: 5,
          turnsLost: 1,
          ph: 5,
          damageDealtAfterDefensive: index % 2 === 0 ? 300 : 100,
          meleeDamage: 100,
          fireDamage: index % 2 === 0 ? 40 : 10,
          blockedDamage: 20,
          damageTaken: 200,
          blocks: 2,
          spellsUsedMap: index % 2 === 0 ? { "102": 2 } : { "101": 3 },
        },
        {
          battleId: battle.id,
          originalId: "hero-2",
          name: "Ally",
          icon: "ally.gif",
          lvl: 200,
          prof: "p",
          team: 1,
          turns: 2,
        },
        {
          battleId: battle.id,
          originalId: "combat-opponent",
          name: "Enemy",
          icon: "enemy.gif",
          lvl: index === 262 ? 50 : 200,
          prof: "m",
          team: 2,
          turns: 2,
        },
      ]),
    ),
  );

  const filters = query({
    world: "combat-test",
    minLevel: 180,
    maxLevel: 220,
    ph: true,
  });

  const fullRows: BattleWithWarriors[] = await runtime.runPromise(
    db.query.battles.findMany({
      where: { userId: "owner", world: "combat-test" },
      with: { warriors: true },
      orderBy: { createdAt: "asc", id: "asc" },
    }),
  );

  const expected = legacy.combatProfile(
    legacy.filterByAnyOpponentLevel(
      fullRows,
      characterSet,
      filters.minLevel,
      filters.maxLevel,
    ),
    characterSet,
  );

  const queryModule = makeBattleAnalyticsQuery(db);

  const actual = await runtime.runPromise(
    makeBattleCombatProfileRead(db, queryModule).getCombatProfile(
      "owner",
      filters,
      characters,
    ),
  );

  expect(actual).toEqual(expected);
  expect(actual.summary).toMatchObject({
    totalBattles: 260,
    wins: 130,
    losses: 130,
    totalPH: 1300,
  });
  expect(actual.matchupByProfession).toEqual([
    { prof: "m", wins: 130, losses: 130, totalBattles: 260, winRate: 50 },
  ]);
  expect(actual.phTrend.map((point) => point.battleId)).toEqual(
    battleRows.slice(0, 260).map((battle) => battle.id),
  );
}, 15_000);

it("selects the recorder among multiple owned participants and uses character order when recorder is absent", async () => {
  await runtime.runPromise(
    db.insert(battles).values(
      [
        {
          id: "selection-fallback",
          characterId: "outsider",
          winningTeam: 1,
          losingTeam: 2,
        },
        {
          id: "selection-recorder",
          characterId: "hero-2",
          winningTeam: 2,
          losingTeam: 1,
        },
      ].map(({ id, ...battle }) => ({
        ...battle,
        ...namedBattle(id, new Date("2025-02-01T00:00:00Z")),
        userId: "owner",
        accountId: "account",
        world: "combat-selection",
        type: "group",
        duration: 100,
        winner: "Winner",
        loser: "Loser",
      })),
    ),
  );

  for (const name of ["selection-recorder", "selection-fallback"]) {
    const battleId = idOf(name);

    const ids =
      name === "selection-recorder"
        ? ["hero-1", "hero-2"]
        : ["hero-2", "hero-1"];

    await runtime.runPromise(
      db.insert(battleWarriors).values(
        ids.map((originalId) => ({
          battleId,
          originalId,
          name: originalId,
          icon: "hero.gif",
          lvl: 100,
          prof: "w",
          team: originalId === "hero-1" ? 1 : 2,
          turns: 1,
          ph: originalId === "hero-1" ? 10 : 20,
        })),
      ),
    );
  }

  const filters = query({ world: "combat-selection" });

  const queryModule = makeBattleAnalyticsQuery(db);

  const actual = await runtime.runPromise(
    makeBattleCombatProfileRead(db, queryModule).getCombatProfile(
      "owner",
      filters,
      characters,
    ),
  );

  const fullRows: BattleWithWarriors[] = await runtime.runPromise(
    db.query.battles.findMany({
      where: { userId: "owner", world: "combat-selection" },
      with: { warriors: true },
      orderBy: { createdAt: "asc", id: "asc" },
    }),
  );

  expect(actual.summary).toMatchObject({
    totalBattles: 2,
    wins: 2,
    losses: 0,
    totalPH: 30,
  });
  expect(
    actual.phTrend.map(({ battleId, value }) => ({ battleId, value })),
  ).toEqual([
    { battleId: idOf("selection-fallback"), value: 10 },
    { battleId: idOf("selection-recorder"), value: 20 },
  ]);
  expect(actual).toEqual(legacy.combatProfile(fullRows, characterSet));
  expect(actual).toEqual(
    legacy.combatProfile(
      fullRows.map((battle) => ({
        ...battle,
        warriors: battle.warriors.slice().reverse(),
      })),
      characterSet,
    ),
  );
});

// Matchmaking head-to-head fixture after the flee, type and owner filters:
// opponent-0 fought battles 0, 3, 6, 9 (three losses, battle 6 on neither
// team, rating deltas 0/null/1/4); opponent-1 fought 1, 7, 10 (three wins,
// deltas -4/2/5); opponent-2 fought 5, 8 (two wins, deltas 0/0). SQL returns
// them by latest battle: opponent-1, opponent-0, opponent-2.
it("filters and sorts opponent records, breaking ties by latest battle", async () => {
  const headToHead = async (overrides: Partial<BattleStatisticsQuery>) =>
    (
      await runtime.runPromise(
        reads.getHeadToHead(
          "owner",
          query({ matchmaking: true, ...overrides }),
          characters,
        ),
      )
    ).map((record) => record.opponentId.replace("opponent-", ""));

  const expectedOrders: Array<
    [NonNullable<BattleStatisticsQuery["sortBy"]>, "asc" | "desc", string]
  > = [
    ["wins", "asc", "021"],
    ["wins", "desc", "120"],
    ["losses", "asc", "120"],
    ["losses", "desc", "012"],
    ["totalBattles", "asc", "210"],
    ["totalBattles", "desc", "102"],
    ["winRate", "asc", "012"],
    ["winRate", "desc", "120"],
    ["lastBattleDate", "asc", "201"],
    ["lastBattleDate", "desc", "102"],
    ["totalRatingDelta", "asc", "210"],
    ["totalRatingDelta", "desc", "012"],
    ["avgRatingDelta", "asc", "210"],
    ["avgRatingDelta", "desc", "012"],
  ];

  for (const [sortBy, sortOrder, expected] of expectedOrders) {
    expect({
      sortBy,
      sortOrder,
      order: (await headToHead({ sortBy, sortOrder })).join(""),
    }).toEqual({ sortBy, sortOrder, order: expected });
  }

  expect(await headToHead({ search: "OPPONENT 1" })).toEqual(["1"]);
  expect(await headToHead({ minBattles: 3 })).toEqual(["1", "0"]);
  expect(await headToHead({ search: "opponent", minBattles: 4 })).toEqual([]);

  const [record] = await runtime.runPromise(
    reads.getHeadToHead(
      "owner",
      query({ matchmaking: true, search: "Opponent 9" }),
      characters,
    ),
  );

  expect(record).toMatchObject({
    opponentId: "opponent-0",
    opponentName: "Opponent 9",
    opponentLvl: 99,
    wins: 0,
    losses: 3,
    totalBattles: 3,
    winRate: 0,
    totalRatingDelta: 5,
    avgRatingDelta: 2.5,
    lastBattleResult: "lost",
    lastBattleDate: "2024-03-10T00:00:00.000Z",
  });

  await runtime.runPromise(
    db.insert(battles).values(
      [
        { id: "latest-older-win", day: 1, winningTeam: 1, losingTeam: 2 },
        { id: "latest-newer-loss", day: 2, winningTeam: 2, losingTeam: 1 },
      ].map(({ day, id, ...battle }) => ({
        ...battle,
        ...namedBattle(id, new Date(Date.UTC(2025, 5, day))),
        userId: "owner",
        accountId: "account",
        characterId: "hero-1",
        world: "h2h-latest",
        type: "1v1",
        duration: 100,
        winner: "Winner",
        loser: "Loser",
        matchmaking: true,
      })),
    ),
  );
  await runtime.runPromise(
    db.insert(battleWarriors).values(
      ["latest-older-win", "latest-newer-loss"].map(idOf).flatMap((battleId) =>
        [
          { battleId, originalId: "hero-1", team: 1 },
          {
            battleId,
            originalId: "latest-opponent",
            team: 2,
          },
        ].map((warrior) => ({
          ...warrior,
          name: warrior.originalId,
          icon: "",
          lvl: 100,
          prof: "w",
          turns: 1,
        })),
      ),
    ),
  );

  expect(
    await runtime.runPromise(
      reads.getHeadToHead(
        "owner",
        query({ matchmaking: true, world: "h2h-latest" }),
        characters,
      ),
    ),
  ).toMatchObject([
    {
      opponentId: "latest-opponent",
      wins: 1,
      losses: 1,
      lastBattleResult: "lost",
      lastBattleDate: "2025-06-02T00:00:00.000Z",
    },
  ]);
});

it("keeps PH-filtered rating responses separate from unfiltered cached responses", async () => {
  cachedValues.clear();

  for (const ph of [false, true, false]) {
    const filters = query({ world: "alpha", ph });
    expect(
      await runtime.runPromise(
        service.getRatingGrowthTimeSeries(filters, "owner"),
      ),
    ).toEqual(
      legacy.ratingGrowth(
        legacyHistory(
          { ...filters, matchmaking: true },
          { rating: true, ratingDelta: true },
        ),
      ),
    );
    expect(
      await runtime.runPromise(
        service.getRatingDeltaByOpponent(filters, "owner"),
      ),
    ).toEqual(
      legacy.ratingDeltaByOpponent(
        legacyHistory(
          { ...filters, matchmaking: true },
          { hasFlee: false, ratingDelta: true },
        )
          .slice()
          .reverse(),
        characterSet,
      ),
    );
  }
});

it("returns empty PvP pages for oversized cursors without passing unrepresentable offsets to PostgreSQL", async () => {
  for (const length of [40, 400]) {
    const result = await runtime.runPromise(
      service.getPlayerVsPlayerBattles(
        {
          ...query({
            includeTotal: true,
            cursor: Buffer.from("9".repeat(length)).toString("base64"),
          }),
          opponentId: "opponent-1",
        },
        "owner",
      ),
    );

    expect(result.battles).toEqual([]);
    expect(result.pagination).toMatchObject({
      hasNext: false,
      hasPrev: true,
      total: 4,
    });
  }

  const all = await runtime.runPromise(
    service.getPlayerVsPlayerBattles(
      { ...query({ size: 1e40 }), opponentId: "opponent-1" },
      "owner",
    ),
  );

  expect(all.battles).toHaveLength(4);
});

it("pages only 1v1 battles against the requested opponent inside the level range, with packed stat fallback", async () => {
  // opponent-2 fought battle-02 (level 92), battle-05 (excluded), battle-08
  // (level 98) and group battle-11 (level 101).
  const pvpQuery = {
    ...query({ minLevel: 93, maxLevel: 101 }),
    opponentId: "opponent-2",
    excludeBattleId: idOf("battle-05"),
  };

  expect(
    await runtime.runPromise(
      reads.getPlayerVsPlayerCount("owner", pvpQuery, characters),
    ),
  ).toBe(1);
  // opponent-1 levels: battle-01 91, battle-04 94, battle-07 97, battle-10 100.
  expect(
    await runtime.runPromise(
      reads.getPlayerVsPlayerCount(
        "owner",
        { ...query({ minLevel: 95, maxLevel: 99 }), opponentId: "opponent-1" },
        characters,
      ),
    ),
  ).toBe(1);
  expect(
    await runtime.runPromise(
      reads.getPlayerVsPlayerPage("owner", pvpQuery, characters, {
        offset: 0,
        size: 20,
      }),
    ),
  ).toMatchObject([
    {
      battleId: idOf("battle-08"),
      createdAt: "2024-03-09T00:00:00.000Z",
      winner: "Hero",
      ratingDelta: 0,
      userRating: 1480,
      userWarrior: { name: "Hero", fireDamage: 28, woundDamageTaken: 3 },
      opponentWarrior: {
        name: "Opponent 8",
        lvl: 98,
        prof: "m",
        fireDamage: 99,
        frostDamage: 17,
      },
    },
  ]);
});

it("keeps the strongest combat highlights, skips flees and admits battles with any opponent in the level range", async () => {
  const combatBattles = [
    {
      id: "explicit-small-win",
      day: 1,
      won: true,
      damage: 100,
      taken: 500,
      blocked: 20,
      levels: [300],
    },
    {
      id: "explicit-big-loss",
      day: 2,
      won: false,
      damage: 300,
      taken: 100,
      blocked: 50,
      levels: [300, 80],
    },
    {
      id: "explicit-flee",
      day: 3,
      won: true,
      damage: 999,
      taken: 999,
      blocked: 999,
      levels: [300],
      hasFlee: true,
    },
    {
      id: "explicit-out-of-range",
      day: 4,
      won: true,
      damage: 5000,
      taken: 5000,
      blocked: 5000,
      levels: [80],
    },
  ];

  await runtime.runPromise(
    db.insert(battles).values(
      combatBattles.map((battle) => ({
        ...namedBattle(battle.id, new Date(Date.UTC(2025, 2, battle.day))),
        userId: "owner",
        accountId: "account",
        characterId: "hero-1",
        world: "combat-explicit",
        type: "group",
        duration: 100,
        winner: "Winner",
        loser: "Loser",
        winningTeam: battle.won ? 1 : 2,
        losingTeam: battle.won ? 2 : 1,
        hasFlee: battle.hasFlee ?? false,
        ratingDelta: 5,
      })),
    ),
  );
  await runtime.runPromise(
    db.insert(battleWarriors).values(
      combatBattles.flatMap((battle) => [
        {
          battleId: idOf(battle.id),
          originalId: "hero-1",
          name: "Hero",
          icon: "hero.gif",
          lvl: 300,
          prof: "w",
          team: 1,
          turns: 5,
          ph: 10,
          damageDealtAfterDefensive: battle.damage,
          meleeDamage: battle.damage,
          damageTaken: battle.taken,
          blockedDamage: battle.blocked,
        },
        ...battle.levels.map((lvl, index) => ({
          battleId: idOf(battle.id),
          originalId: `explicit-opponent-${index}`,
          name: "Enemy",
          icon: "enemy.gif",
          lvl,
          prof: lvl === 300 ? "m" : "p",
          team: 2,
          turns: 5,
        })),
      ]),
    ),
  );

  const profile = await runtime.runPromise(
    makeBattleCombatProfileRead(
      db,
      makeBattleAnalyticsQuery(db),
    ).getCombatProfile(
      "owner",
      query({ world: "combat-explicit", minLevel: 250, maxLevel: 350 }),
      characters,
    ),
  );

  expect(profile.summary).toMatchObject({
    totalBattles: 2,
    wins: 1,
    losses: 1,
    totalPH: 20,
    totalRatingDelta: 10,
  });
  expect(
    profile.highlights.map(({ battleId, type, value }) => ({
      battleId,
      type,
      value,
    })),
  ).toEqual([
    {
      battleId: idOf("explicit-small-win"),
      type: "biggestComeback",
      value: 500,
    },
    { battleId: idOf("explicit-big-loss"), type: "biggestDamage", value: 300 },
    {
      battleId: idOf("explicit-big-loss"),
      type: "biggestMitigation",
      value: 50,
    },
  ]);
  expect(profile.matchupByProfession).toEqual([
    { prof: "m", wins: 1, losses: 1, totalBattles: 2, winRate: 50 },
    { prof: "p", wins: 0, losses: 1, totalBattles: 1, winRate: 0 },
  ]);
});
