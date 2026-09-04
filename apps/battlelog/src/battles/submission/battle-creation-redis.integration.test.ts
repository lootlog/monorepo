import { afterAll, beforeAll, beforeEach, expect, it } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import { readdir } from "node:fs/promises";
import pg from "pg";
import { makeDrizzleDatabase } from "#src/database/database";
import { makeRedisStore } from "#src/infrastructure/redis-store";
import { makeBattles } from "#src/battles/battles.service";
import { makeBattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import { makeBattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import { makeBattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { makeBattlePagination } from "#src/battles/analytics/pagination.service";
import { makeBattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import { makeBattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import {
  createBattleSemanticFingerprint,
  normalizeBattleSubmission,
} from "./battle-submission.js";
import type { CreateBattleInput } from "./create-battle.js";

const data: CreateBattleInput = {
  accountId: "account-1",
  characterId: "220",
  world: "pandora",
  events: [
    {
      ev: 1_785_091_976.6,
      f: {
        endBattle: 1,
        init: "1",
        m: [
          "220=100;7533=90;+dmg=10;-dmg=10",
          "0;0;winner=first",
          "0;0;loser=second",
        ],
        w: {
          "220": {
            icon: "first.gif",
            lvl: 300,
            name: "first",
            originalId: 220,
            prof: "p",
            team: 1,
          },
          "7533": {
            icon: "second.gif",
            lvl: 300,
            name: "second",
            originalId: 7533,
            prof: "w",
            team: 2,
          },
        },
      },
    },
  ],
};
const userId = "lock-owner";
const lockKey = `battle-submission:${createBattleSemanticFingerprint({ data: normalizeBattleSubmission(data), userId })}:lock`;
let postgres: StartedPostgreSqlContainer;
let redisContainer: StartedTestContainer;
let pool: pg.Pool;
let runtime: ManagedRuntime.ManagedRuntime<
  PgClient.PgClient | Redis.Redis,
  unknown
>;
let services: Awaited<ReturnType<typeof createServices>>;

const createServices = () =>
  runtime.runPromise(
    Effect.gen(function* () {
      const database = yield* makeDrizzleDatabase;
      const redisApi = yield* Redis.Redis;
      const redis = makeRedisStore(
        redisApi,
        (operation) => runtime.runPromise(operation),
        { prefix: "battlelock-test" },
      );
      const cache = makeBattleAnalyticsCache(redis);
      const analytics = makeBattleAnalytics(
        database,
        cache,
        makeBattleAnalyticsQuery(database, cache),
      );
      // R2 is the only fake boundary; database, Redis commands and Lua are real.
      const uploads = new Map<string, unknown>();
      const battles = makeBattles(
        database,
        {
          uploadBattleData: async (id, body) => {
            uploads.set(id, body);
          },
          getBattleData: async (id, decode) =>
            decode(JSON.stringify(uploads.get(id))),
          deleteBattleData: async (id) => {
            uploads.delete(id);
          },
        },
        redis,
        makeBattlePagination(database),
        analytics,
        makeBattleListFilter(database),
        makeBattleMetadata(database, redis),
        {
          cacheTtlSeconds: 10,
          lockTtlSeconds: 1,
          lockRefreshIntervalMs: 100,
          waitIntervalMs: 20,
          waitTimeoutMs: 5_000,
        },
      );
      return {
        battles,
        redis,
        redisApi,
        uploads,
        cache,
        analytics,
        metadata: makeBattleMetadata(database, redis),
      };
    }),
  );

beforeAll(async () => {
  postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
  redisContainer = await new GenericContainer("redis:7.4-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });
  const migrations = new URL("../../../drizzle/", import.meta.url);
  for (const entry of (await readdir(migrations)).sort()) {
    const file = Bun.file(new URL(`${entry}/migration.sql`, migrations));
    if (await file.exists()) await pool.query(await file.text());
  }
  runtime = ManagedRuntime.make(
    Layer.merge(
      makePostgresLayer({ url: Redacted.make(postgres.getConnectionUri()) }),
      BunRedis.layer({
        url: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`,
      }),
    ),
  );
  services = await createServices();
}, 60_000);

afterAll(async () => {
  await runtime?.dispose();
  await pool?.end();
  await redisContainer?.stop();
  await postgres?.stop();
});

beforeEach(async () => {
  await pool.query(
    "TRUNCATE battles, user_characters, battle_object_deletions CASCADE",
  );
  await runtime.runPromise(services.redisApi.send("FLUSHDB"));
  services.uploads.clear();
});

const waitForLock = async () => {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const token = await services.redis.get(lockKey);
    if (token !== null) return token;
    await Bun.sleep(10);
  }
  throw new Error("Battle creation did not acquire its Redis lock");
};

it("renews the real Lua lock beyond its TTL while concurrent callers create one canonical battle", async () => {
  const blocker = await pool.connect();
  const creations: Promise<{ battleId: string }>[] = [];
  try {
    await blocker.query("BEGIN; LOCK TABLE battles IN ACCESS EXCLUSIVE MODE");
    creations.push(
      runtime.runPromise(
        services.battles.createBattle({
          data: { ...data, submissionId: "first" },
          userId,
        }),
      ),
    );
    const token = await waitForLock();
    await Bun.sleep(1_250);
    expect(await services.redis.get(lockKey)).toBe(token);
    expect(
      await runtime.runPromise(
        services.redisApi.send<number>("PTTL", `battlelock-test:${lockKey}`),
      ),
    ).toBeGreaterThan(0);
    creations.push(
      runtime.runPromise(
        services.battles.createBattle({
          data: { ...data, submissionId: "second" },
          userId,
        }),
      ),
    );
    await Bun.sleep(100);
    expect(await services.redis.get(lockKey)).toBe(token);
    await blocker.query("COMMIT");
    const results = await Promise.all(creations);
    expect(results[1]).toEqual(results[0]);
    expect((await pool.query("SELECT id FROM battles")).rows).toEqual([
      { id: results[0].battleId },
    ]);
    expect(services.uploads.size).toBe(1);
    expect(await services.redis.get(lockKey)).toBeNull();
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
    await Promise.allSettled(creations);
  }
}, 10_000);

it("does not renew or release another owner's real Redis lock after ownership changes", async () => {
  const blocker = await pool.connect();
  let creation: Promise<unknown> | undefined;
  try {
    await blocker.query("BEGIN; LOCK TABLE battles IN ACCESS EXCLUSIVE MODE");
    creation = runtime.runPromise(
      Effect.exit(services.battles.createBattle({ data, userId })),
    );
    await waitForLock();
    await services.redis.set(lockKey, "replacement-owner", 5);
    await Bun.sleep(250);
    expect(
      await runtime.runPromise(
        services.redisApi.send<number>("PTTL", `battlelock-test:${lockKey}`),
      ),
    ).toBeGreaterThan(3_000);
    await blocker.query("COMMIT");
    expect(await creation).toMatchObject({ _tag: "Failure" });
    expect(await services.redis.get(lockKey)).toBe("replacement-owner");
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
    await creation;
  }
}, 10_000);

it("invalidates only the user's cache generation and cannot restore a stale in-flight result", async () => {
  const decode = (text: string) => Number(text);
  const cached = (user: string, value: number) =>
    services.cache.getOrSetJson(
      user,
      "summary",
      () => Effect.succeed(value),
      decode,
    );
  expect(await runtime.runPromise(cached("one", 1))).toBe(1);
  expect(await runtime.runPromise(cached("two", 2))).toBe(2);
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: result, resolve: finish } = Promise.withResolvers<number>();
  const oldRead = runtime.runPromise(
    services.cache.getOrSetJson(
      "one",
      "slow",
      () =>
        Effect.tryPromise(async () => {
          begin();
          return await result;
        }),
      decode,
    ),
  );
  await started;
  const before = await runtime.runPromise(
    services.redisApi.send<string>("INFO", "commandstats"),
  );
  await runtime.runPromise(services.cache.invalidateUserAnalytics("one"));
  const after = await runtime.runPromise(
    services.redisApi.send<string>("INFO", "commandstats"),
  );
  expect(after.match(/cmdstat_scan:[^\r\n]*/)?.[0]).toBe(
    before.match(/cmdstat_scan:[^\r\n]*/)?.[0],
  );
  expect(await runtime.runPromise(cached("one", 3))).toBe(3);
  expect(await runtime.runPromise(cached("two", 4))).toBe(2);
  await services.redis.del("battle-cache-generation:two");
  expect(await runtime.runPromise(cached("two", 6))).toBe(6);
  expect(
    await runtime.runPromise(
      services.cache.getOrSetJson(
        "one",
        "slow",
        () => Effect.succeed(5),
        decode,
      ),
    ),
  ).toBe(5);
  finish(1);
  expect(await oldRead).toBe(1);
  expect(
    await runtime.runPromise(
      services.cache.getOrSetJson(
        "one",
        "slow",
        () => Effect.succeed(9),
        decode,
      ),
    ),
  ).toBe(5);
});

it("aggregates battle summaries in SQL without losing flee PH, level filters or user isolation", async () => {
  await pool.query(
    `INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('uc', 'owner', 'hero', 'Hero', 'world')`,
  );
  const fixtures = [
    { id: "win", winningTeam: 1, losingTeam: 2, ph: 50 },
    { id: "loss", winningTeam: 2, losingTeam: 1, ph: 10 },
    { id: "flee", winningTeam: 2, losingTeam: 1, ph: 5, hasFlee: true },
    { id: "draw", winningTeam: 0, losingTeam: 0, ph: 20 },
    { id: "low", winningTeam: 1, losingTeam: 2, ph: 99, lvl: 10 },
    {
      id: "other",
      winningTeam: 1,
      losingTeam: 2,
      ph: 99,
      owner: "someone-else",
    },
    { id: "team", winningTeam: 1, losingTeam: 2, ph: 99, type: "team" },
  ];
  for (const fixture of fixtures) {
    await pool.query(
      `INSERT INTO battles (id, "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", "hasFlee", statistics)
      VALUES ($1,$2,'account','hero','world',10,$3,'Hero','Enemy',$4,$5,$6,'{}')`,
      [
        fixture.id,
        fixture.owner ?? "owner",
        fixture.type ?? "1v1",
        fixture.winningTeam,
        fixture.losingTeam,
        fixture.hasFlee ?? false,
      ],
    );
    await pool.query(
      `INSERT INTO battle_warriors (id,"battleId","originalId",name,lvl,prof,icon,team,turns,ph)
      VALUES ($1,$2,'hero','Hero',100,'w','hero.gif',1,1,$3), ($4,$2,'enemy','Enemy',$5,'m','enemy.gif',2,1,0)`,
      [
        `${fixture.id}-hero`,
        fixture.id,
        fixture.ph,
        `${fixture.id}-enemy`,
        fixture.lvl ?? 100,
      ],
    );
  }
  const filters = { characterId: "hero", minLevel: 80, maxLevel: 120 };
  expect(
    await runtime.runPromise(
      services.analytics.getBattleAnalytics(filters, "owner"),
    ),
  ).toEqual({
    wins: 1,
    losses: 1,
    totalBattles: 2,
    totalPH: 85,
    winRatio: 50,
  });
  expect(
    await runtime.runPromise(
      services.analytics.calculateProfessionWinRate(
        {
          ...filters,
          size: 20,
          sortBy: "totalBattles",
          sortOrder: "desc",
          includeTotal: false,
        },
        "owner",
      ),
    ),
  ).toEqual([{ prof: "m", wins: 1, losses: 1, totalBattles: 2, winRate: 50 }]);
  expect(
    await runtime.runPromise(
      services.analytics.getBattleAnalytics(
        { ...filters, matchmaking: true },
        "owner",
      ),
    ),
  ).toEqual({
    wins: 0,
    losses: 0,
    totalBattles: 0,
    totalPH: 0,
    winRatio: 0,
  });
});

it("reloads corrupted metadata cache and shares invalidation with analytics", async () => {
  await services.redis.set("battle-cache-generation:owner", "test-generation");
  const key =
    "battle-cache:v2:owner:test-generation:battle-characters:list:owner";
  await services.redis.set(key, "{broken-json", 300);
  expect(
    await runtime.runPromise(services.metadata.getUserCharacters("owner")),
  ).toEqual({ characters: [] });
  await pool.query(
    `INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('new-uc','owner','hero','Hero','world')`,
  );
  await runtime.runPromise(services.cache.invalidateUserAnalytics("owner"));
  expect(
    await runtime.runPromise(services.metadata.getUserCharacters("owner")),
  ).toEqual({
    characters: [{ id: "hero", name: "Hero", world: "world", icon: "" }],
  });
});
