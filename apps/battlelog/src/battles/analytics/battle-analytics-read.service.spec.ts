import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";
import { Effect, ManagedRuntime } from "effect";
import { sql } from "drizzle-orm";
import { relations } from "#src/database/relations";
import { battles, battleWarriors, userCharacters } from "#src/database/schema";
import { unusedRedisStore } from "../../../test/battle-fixtures.js";
import { makeBattleAnalyticsCache } from "./battle-analytics-cache.service.js";
import { makeBattleAnalyticsQuery } from "./battle-analytics-query.service.js";
import { makeBattleAnalyticsRead } from "./battle-analytics-read.service.js";
import { makeBattleCombatProfileRead } from "./battle-combat-profile-read.service.js";
import { combatProfileCalculator } from "./combat-profile-calculator.service.js";
import { makeBattleAnalytics } from "./battle-analytics.service.js";
import { battleAnalyticsDomain as domain } from "./battle-analytics-domain.service.js";
import { battleSummaryCalculator as summary } from "./battle-summary-calculator.service.js";
import { headToHeadCalculator } from "./head-to-head-calculator.service.js";
import { playerVsPlayerCalculator } from "./player-vs-player-calculator.service.js";
import { abyssSeasonCalculator } from "./abyss-season-calculator.service.js";
import type { BattleStatisticsQuery } from "./query-battle-statistics.js";
import type { InflatedBattleWithWarriors } from "./battle-analytics.types.js";

const runtime = ManagedRuntime.make(PgliteClient.layer({}));

const dbEffect = makeWithDefaults({ relations });

let db: Effect.Success<typeof dbEffect>;

let reads: ReturnType<typeof makeBattleAnalyticsRead>;

let service: ReturnType<typeof makeBattleAnalytics>;

let fullHistory: InflatedBattleWithWarriors[];

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
  domain.filterByOpponentLevel(
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
    const id = `battle-${String(index).padStart(2, "0")}`;
    const characterId = characters[index % 2];
    const isLoss = index % 3 === 0;
    await runtime.runPromise(
      db.insert(battles).values({
        id,
        userId: index === 13 ? "foreign" : "owner",
        accountId: "account",
        characterId,
        world: index === 10 ? "beta" : "alpha",
        createdAt: new Date(Date.UTC(2024, index < 8 ? 0 : 2, index + 1)),
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
        statistics: { irrelevantWidePayload: "x".repeat(2048) },
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
        fireDamage: 7,
        stats: { fireDamage: 20 + index, woundDamageTaken: 3 },
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
          frostDamage: 17,
          stats:
            index === 8
              ? sql`'{"frostDamage":"malformed","fireDamage":99}'::jsonb`
              : { frostDamage: 30 + index },
        }),
      );
  }

  fullHistory = domain.inflateBattleRows(
    await runtime.runPromise(
      db.query.battles.findMany({
        where: { userId: "owner" },
        columns: { statistics: false },
        with: { warriors: true },
        orderBy: { createdAt: "asc", id: "asc" },
      }),
    ),
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
      ).toEqual(
        summary.calculateCurrentStreak(
          resolved.slice().reverse(),
          characterSet,
        ),
      );
      expect(
        await runtime.runPromise(
          reads.getDuration("owner", filtersQuery, characters),
        ),
      ).toEqual(
        summary.calculateBattleDurationStats(
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
        summary.calculatePhGrowthTimeSeries(
          legacyHistory(filtersQuery, { ph: true }),
          characterSet,
        ),
      );
      expect(
        await runtime.runPromise(
          reads.getRatingGrowth("owner", filtersQuery, characters),
        ),
      ).toEqual(
        summary.calculateRatingGrowthTimeSeries(
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
        await runtime.runPromise(
          reads.getHeadToHead("owner", h2hQuery, characters),
        ),
      ).toEqual(
        headToHeadCalculator.calculateRecords(
          legacyHistory(h2hQuery, { hasFlee: false }).slice().reverse(),
          characterSet,
          h2hQuery,
        ),
      );
      expect(
        await runtime.runPromise(
          reads.getRatingByOpponent("owner", filtersQuery, characters),
        ),
      ).toEqual(
        summary.calculateRatingDeltaByOpponent(
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
      abyssSeasonCalculator.calculateSeasons(
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
        excludeBattleId: "battle-02",
      };

      const expected = playerVsPlayerCalculator.calculateBattles(
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

it("folds combat history across tied-date batches without losing packed fallback, team matchups or visibility", async () => {
  const battleRows = Array.from({ length: 264 }, (_, index) => ({
    id: `combat-${String(index).padStart(3, "0")}`,
    createdAt: sql`${"2025-01-01T00:00:00.000123"}::timestamp`,
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
    statistics: { unused: "x".repeat(2048) },
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
          damageDealtAfterDefensive: 100,
          meleeDamage: 100,
          fireDamage: 10,
          blockedDamage: 20,
          damageTaken: 200,
          blocks: 2,
          spellsUsedMap: { "101": 3 },
          stats: sql`${JSON.stringify({
            damageDealtAfterDefensive: index % 2 === 0 ? 300 : "corrupt",
            fireDamage: index % 2 === 0 ? 40 : null,
            spellsUsedMap:
              index % 2 === 0 ? { "102": 2 } : { "102": "corrupt" },
            ph: 99999,
          })}::jsonb`,
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

  const fullRows = domain.inflateBattleRows(
    await runtime.runPromise(
      db.query.battles.findMany({
        where: { userId: "owner", world: "combat-test" },
        columns: { statistics: false },
        with: { warriors: true },
        orderBy: { createdAt: "asc", id: "asc" },
      }),
    ),
  );

  const expected = combatProfileCalculator.calculate(
    domain.filterByAnyOpponentLevel(
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
});

it("selects the recorder among multiple owned participants and uses character order when recorder is absent", async () => {
  await runtime.runPromise(
    db.insert(battles).values(
      [
        {
          id: "selection-recorder",
          characterId: "hero-2",
          winningTeam: 2,
          losingTeam: 1,
        },
        {
          id: "selection-fallback",
          characterId: "outsider",
          winningTeam: 1,
          losingTeam: 2,
        },
      ].map((battle) => ({
        ...battle,
        userId: "owner",
        accountId: "account",
        world: "combat-selection",
        type: "group",
        createdAt: new Date("2025-02-01T00:00:00Z"),
        duration: 100,
        winner: "Winner",
        loser: "Loser",
        statistics: {},
      })),
    ),
  );

  for (const battleId of ["selection-recorder", "selection-fallback"]) {
    const ids =
      battleId === "selection-recorder"
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

  const fullRows = domain.inflateBattleRows(
    await runtime.runPromise(
      db.query.battles.findMany({
        where: { userId: "owner", world: "combat-selection" },
        columns: { statistics: false },
        with: { warriors: true },
        orderBy: { createdAt: "asc", id: "asc" },
      }),
    ),
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
    { battleId: "selection-fallback", value: 10 },
    { battleId: "selection-recorder", value: 20 },
  ]);
  expect(actual).toEqual(
    combatProfileCalculator.calculate(fullRows, characterSet),
  );
  expect(actual).toEqual(
    combatProfileCalculator.calculate(
      fullRows.map((battle) => ({
        ...battle,
        warriors: battle.warriors.slice().reverse(),
      })),
      characterSet,
    ),
  );
});

it("keeps every opponent sort and aggregate filter consistent with the calculator", async () => {
  const sortKeys = [
    "wins",
    "losses",
    "totalBattles",
    "winRate",
    "lastBattleDate",
    "totalRatingDelta",
    "avgRatingDelta",
  ] as const;

  for (const sortBy of sortKeys) {
    for (const sortOrder of ["asc", "desc"] as const) {
      const filters = query({
        matchmaking: true,
        search: "Opponent",
        minBattles: 2,
        sortBy,
        sortOrder,
      });

      expect(
        await runtime.runPromise(
          reads.getHeadToHead("owner", filters, characters),
        ),
      ).toEqual(
        headToHeadCalculator.calculateRecords(
          legacyHistory(filters, { hasFlee: false }).slice().reverse(),
          characterSet,
          filters,
        ),
      );
    }
  }
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
      summary.calculateRatingGrowthTimeSeries(
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
      summary.calculateRatingDeltaByOpponent(
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
