/* oxlint-disable anti-slop-effect/no-service-constructor-imports -- This standalone benchmark is the composition root for the services it measures. */
// Run: bun --conditions=development scripts/benchmark-battle-analytics.ts
// Uses a disposable PostgreSQL container and 35,000 synthetic battles. Timings
// include database transfer and calculation, but exclude JSON size measurement.
import { makePostgresLayer } from "@lootlog/database";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Effect, ManagedRuntime, Redacted } from "effect";
import { sql } from "drizzle-orm";
import { drizzleDatabaseEffect } from "../src/database/database.js";
import { makeBattleReadBudget } from "../src/database/battle-read-budget.js";
import { battles, battleWarriors } from "../src/database/schema.js";
import { makeBattleAnalyticsRead } from "../src/battles/analytics/battle-analytics-read.service.js";
import { makeBattleCombatProfileRead } from "../src/battles/analytics/battle-combat-profile-read.service.js";
import { makeBattleAnalyticsQuery } from "../src/battles/analytics/battle-analytics-query.service.js";
import { battleAnalyticsDomain as domain } from "../src/battles/analytics/battle-analytics-domain.service.js";
import { headToHeadCalculator } from "../src/battles/analytics/head-to-head-calculator.service.js";
import { combatProfileCalculator } from "../src/battles/analytics/combat-profile-calculator.service.js";

const accountBattles = 35_000;

const postgres = await new PostgreSqlContainer("postgres:17-alpine").start();

const runtime = ManagedRuntime.make(
  makePostgresLayer({
    url: Redacted.make(postgres.getConnectionUri()),
    maxConnections: 2,
  }),
);

try {
  const db = await runtime.runPromise(drizzleDatabaseEffect);
  await runtime.runPromise(
    migrate(db, {
      migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
    }),
  );

  for (let offset = 0; offset < accountBattles; offset += 1000) {
    const batch = Array.from(
      { length: Math.min(1000, accountBattles - offset) },
      (_, index) => offset + index + 1,
    );

    await runtime.runPromise(
      db.insert(battles).values(
        batch.map((index) => ({
          id: `battle-${index}`,
          userId: "benchmark",
          accountId: "synthetic",
          characterId: "hero",
          world: "synthetic",
          duration: 100 + (index % 500),
          type: "1v1",
          winner: "Hero",
          loser: "Opponent",
          winningTeam: index % 3 === 0 ? 2 : 1,
          losingTeam: index % 3 === 0 ? 1 : 2,
          matchmaking: true,
          ratingDelta: index % 3 === 0 ? -10 : 15,
          statistics: { unused: "x".repeat(4096) },
          createdAt: new Date(Date.UTC(2024, 0, 1) + index * 60_000),
        })),
      ),
    );
    await runtime.runPromise(
      db.insert(battleWarriors).values(
        batch.flatMap((index) => [
          {
            id: `user-${index}`,
            battleId: `battle-${index}`,
            originalId: "hero",
            name: "Hero",
            icon: "hero.png",
            prof: "w",
            lvl: 100,
            team: 1,
            turns: 20,
            ph: 2,
            stats: { fireDamage: 200, damageDealtAfterDefensive: 1000 },
          },
          {
            id: `opponent-${index}`,
            battleId: `battle-${index}`,
            originalId: `opponent-${index % 80}`,
            name: `Opponent ${index}`,
            icon: "opponent.png",
            prof: "m",
            lvl: 100,
            team: 2,
            turns: 17,
            ph: 0,
            stats: { frostDamage: 400 },
          },
        ]),
      ),
    );
  }

  await runtime.runPromise(db.execute(sql`analyze ${battles}`));
  await runtime.runPromise(db.execute(sql`analyze ${battleWarriors}`));

  const filters = {
    size: 20,
    sortBy: "totalBattles",
    sortOrder: "desc",
    includeTotal: false,
    matchmaking: true,
  } as const;

  const queryModule = makeBattleAnalyticsQuery(db);

  const reads = makeBattleAnalyticsRead(db, queryModule);
  const combatReads = makeBattleCombatProfileRead(db, queryModule);

  const budget = makeBattleReadBudget(db, {
    concurrency: 2,
    statementTimeoutMs: 2000,
    timeoutMs: 3000,
  });

  const read: typeof budget = (operation) =>
    budget(operation, { consistentSnapshot: true });

  const measure = async <T>(
    name: string,
    operation: Effect.Effect<{ result: T; fetchedRows?: unknown[] }, unknown>,
  ) => {
    Bun.gc(true);
    const startedAt = performance.now();
    const { result, fetchedRows } = await runtime.runPromise(operation);
    const elapsedMs = performance.now() - startedAt;
    await Bun.write(
      Bun.stdout,
      JSON.stringify({
        name,
        accountBattles,
        elapsedMs,
        fetchedRows: fetchedRows?.length,
        serializedDataBytes: Buffer.byteLength(
          JSON.stringify(fetchedRows ?? result),
        ),
      }) + "\n",
    );

    return result;
  };

  const legacyHeadToHead = await measure(
    "legacy-head-to-head",
    Effect.gen(function* () {
      const fetchedRows = yield* db.query.battles.findMany({
        where: {
          userId: "benchmark",
          type: "1v1",
          hasFlee: false,
          matchmaking: true,
        },
        columns: { statistics: false },
        with: { warriors: true },
        orderBy: { createdAt: "desc" },
      });

      return {
        fetchedRows,
        result: headToHeadCalculator.calculateRecords(
          domain.inflateBattleRows(fetchedRows),
          new Set(["hero"]),
          filters,
        ),
      };
    }),
  );

  const headToHead = await measure(
    "sql-head-to-head",
    reads.getHeadToHead("benchmark", filters, ["hero"]).pipe(
      read,
      Effect.map((result) => ({ result })),
    ),
  );

  if (!Bun.deepEquals(headToHead, legacyHeadToHead))
    throw new Error("Head-to-head parity failed");

  const legacyCombat = await measure(
    "legacy-combat-profile",
    Effect.gen(function* () {
      const fetchedRows = yield* db.query.battles.findMany({
        where: { userId: "benchmark", matchmaking: true },
        columns: { statistics: false },
        with: { warriors: true },
        orderBy: { createdAt: "asc" },
      });

      return {
        fetchedRows,
        result: combatProfileCalculator.calculate(
          domain.inflateBattleRows(fetchedRows),
          new Set(["hero"]),
        ),
      };
    }),
  );

  const combat = await measure(
    "bounded-combat-profile",
    combatReads.getCombatProfile("benchmark", filters, ["hero"]).pipe(
      read,
      Effect.map((result) => ({ result })),
    ),
  );

  if (!Bun.deepEquals(combat, legacyCombat))
    throw new Error("Combat profile parity failed");
  await Bun.write(
    Bun.stdout,
    JSON.stringify({
      parity: "passed",
      opponentRecords: headToHead.length,
      combatTrendPoints: combat.phTrend.length,
    }) + "\n",
  );
} finally {
  await runtime.dispose();
  await postgres.stop();
}
