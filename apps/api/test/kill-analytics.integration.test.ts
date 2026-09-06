import { requireIsolatedTestDatabase } from "./isolated-test-database.js";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { PgDialect } from "drizzle-orm/pg-core";
import { DateTime, Effect, Schema } from "effect";
import { TestClock } from "effect/testing";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import { makeUserKillAnalytics } from "../src/kills/user-kill-analytics.js";
import {
  getKillAnalyticsRange,
  userKillAnalyticsSql,
} from "../src/kills/user-kill-analytics-query.js";
import type { KillQueryCache } from "../src/kills/kill-query-support.js";
const now = "2026-10-25T02:30:00Z";
const cache: KillQueryCache = { getOrSet: (_key, _schema, load) => load };
const client = new Client({
  connectionString: requireIsolatedTestDatabase(),
});
const readAnalytics = (world?: string) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(Date.parse(now));
    return yield* makeUserKillAnalytics(
      yield* ApiDatabase,
      cache,
    ).getUserKillAnalytics("analytics-owner", {
      days: 7,
      ...(world ? { world } : {}),
    });
  }).pipe(
    Effect.provide(ApiDatabaseLive),
    Effect.provide(TestClock.layer()),
    Effect.runPromise,
  );
const readActivity = (world?: string) =>
  Effect.gen(function* () {
    yield* TestClock.setTime(Date.parse(now));
    return yield* makeUserKillAnalytics(
      yield* ApiDatabase,
      cache,
    ).getUserKillActivity("analytics-owner", world ? { world } : {});
  }).pipe(
    Effect.provide(ApiDatabaseLive),
    Effect.provide(TestClock.layer()),
    Effect.runPromise,
  );
const bucket = async (
  date: string,
  kills: number,
  world = "tempest",
  user = "analytics-owner",
  npcId = 1,
) => {
  await client.query(
    `insert into "UserKillStatsBucket" (id,"userId",world,"npcId","npcName","npcType","npcLvl","totalKills","periodStart","updatedAt") values ($1,$2,$3,$4,'NPC','HERO',100,$5,$6::timestamptz at time zone 'UTC',now())`,
    [randomUUID(), user, world, npcId, kills, date],
  );
};
const totals = async (user = "analytics-owner", extra = 0) => {
  await client.query(
    `insert into "UserKillStats" (id,"userId",world,"npcId","npcName","npcType","npcLvl","totalKills","updatedAt") select gen_random_uuid()::text,"userId",world,"npcId",max("npcName"),'HERO',100,sum("totalKills")+$2,now() from "UserKillStatsBucket" where "userId"=$1 group by "userId",world,"npcId"`,
    [user, extra],
  );
};
describe("personal kill analytics PostgreSQL boundary", () => {
  beforeAll(async () => {
    await client.connect();
  });
  afterAll(async () => {
    await client.end();
  });
  beforeEach(async () => {
    requireIsolatedTestDatabase();
    await client.query('truncate "UserKillStatsBucket", "UserKillStats"');
  });
  it("aggregates repeated Warsaw hours, isolates owners/worlds, and aligns all deltas", async () => {
    await bucket("2026-10-25T00:00:00Z", 3);
    await bucket("2026-10-25T01:00:00Z", 4);
    await bucket("2026-10-25T02:00:00Z", 11);
    await bucket("2026-10-18T00:00:00Z", 5);
    await bucket("2026-10-25T00:00:00Z", 6, "lunia");
    await bucket("2026-10-25T00:00:00Z", 999, "tempest", "another-owner");
    await totals();
    await totals("another-owner");
    const result = await readAnalytics("tempest");
    expect(result.overview.totalKills).toBe(18);
    expect(
      result.hourlyWeekday.find((cell) => cell.weekday === 7 && cell.hour === 2)
        ?.kills,
    ).toBe(7);
    expect(
      result.hourlyWeekday.find((cell) => cell.weekday === 7 && cell.hour === 3)
        ?.kills,
    ).toBe(11);
    expect(result.comparison.currentKills).toBe(7);
    expect(result.comparison.previousKills).toBe(5);
    expect(result.npcs[0]?.comparisonKills).toBe(7);
    expect(result.npcs[0]?.deltaKills).toBe(2);
    expect(result.worlds[0]?.deltaKills).toBe(2);
    expect(result.meta.allTimeKills).toBe(23);
    expect(result.daily.at(-1)).toEqual({
      date: "2026-10-25",
      kills: 18,
      worlds: ["tempest"],
      partial: true,
    });
    expect(result.npcs).toHaveLength(1);
  });
  it("returns source worlds for the lightweight calendar with owner and world filtering", async () => {
    await bucket("2026-10-24T22:00:00Z", 3, "tempest");
    await bucket("2026-10-25T00:00:00Z", 4, "tempest");
    await bucket("2026-10-25T00:00:00Z", 6, "lunia");
    await bucket("2026-10-25T00:00:00Z", 99, "private", "another-owner");
    await bucket("2026-10-25T00:00:00Z", 0, "zero");
    await totals();
    await totals("another-owner");
    const all = await readActivity();
    expect(all.daily.at(-1)).toEqual({
      date: "2026-10-25",
      kills: 13,
      partial: true,
      worlds: ["lunia", "tempest"],
    });
    expect(all.daily.at(-2)?.worlds).toEqual([]);
    const filtered = await readActivity("tempest");
    expect(filtered.daily.at(-1)?.worlds).toEqual(["tempest"]);
    expect(filtered.daily.at(-1)?.kills).toBe(7);
  });
  it("returns real missing-history metadata and lightweight exactly-112-date activity", async () => {
    await bucket("2026-10-25T00:00:00Z", 4);
    await totals("analytics-owner", 96);
    const result = await Effect.gen(function* () {
      yield* TestClock.setTime(Date.parse(now));
      return yield* makeUserKillAnalytics(
        yield* ApiDatabase,
        cache,
      ).getUserKillActivity("analytics-owner", {});
    }).pipe(
      Effect.provide(ApiDatabaseLive),
      Effect.provide(TestClock.layer()),
      Effect.runPromise,
    );
    expect(result.daily).toHaveLength(112);
    expect(result.meta.untimedKills).toBe(96);
    expect(result.meta.coverage).toBe("partial");
    expect(result.daily[0]?.kills).toBeNull();
    expect(result.daily[0]?.worlds).toEqual([]);
    expect(result.daily.at(-1)?.kills).toBe(4);
    expect(Object.keys(result).sort()).toEqual(["daily", "meta"]);
  });
  it("bounds rankings and query response on populated account history", async () => {
    await client.query(
      `insert into "UserKillStatsBucket" (id,"userId",world,"npcId","npcName","npcType","npcLvl","totalKills","periodStart","updatedAt") select gen_random_uuid()::text,case when i<=10000 then 'analytics-owner' else 'other-owner' end,'tempest',i%200,'NPC '||(i%200),'HERO',100,1,timestamp '2026-10-20 00:00:00' + (i/200)*interval '1 hour',now() from generate_series(1,30000) i`,
    );
    await totals();
    await client.query('analyze "UserKillStatsBucket"');
    const query = new PgDialect().sqlToQuery(
      userKillAnalyticsSql(
        "analytics-owner",
        undefined,
        getKillAnalyticsRange(DateTime.makeUnsafe(now), 7),
        false,
      ),
    );
    const result = await client.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`,
      query.params,
    );
    const explain = Schema.decodeUnknownSync(
      Schema.Array(
        Schema.Struct({
          "QUERY PLAN": Schema.Array(
            Schema.Struct({
              "Execution Time": Schema.Number,
              Plan: Schema.Unknown,
            }),
          ),
        }),
      ),
    )(result.rows)[0]?.["QUERY PLAN"][0];
    expect(explain).toBeDefined();
    expect(JSON.stringify(explain?.Plan)).toMatch(/Index|Bitmap/);
    process.stdout.write(
      `kill analytics fixture: 30,000 hourly rows, 10,000 scoped; execution ms ${explain?.["Execution Time"]}\n`,
    );
    const analytics = await readAnalytics();
    expect(analytics.overview.totalKills).toBe(10000);
    expect(analytics.npcs).toHaveLength(20);
    expect(analytics.npcGains).toHaveLength(10);
    expect(analytics.daily).toHaveLength(7);
    expect(analytics.hourlyWeekday).toHaveLength(168);
    expect(JSON.stringify(analytics).length).toBeLessThan(35000);
  });
});
