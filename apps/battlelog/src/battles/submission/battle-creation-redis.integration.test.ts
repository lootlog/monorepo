import { afterAll, beforeAll, beforeEach, expect, it } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import { CacheFillTimeoutError } from "@lootlog/database/redis-cache-fill";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { Effect, Exit, Layer, ManagedRuntime, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import pg from "pg";
import { drizzleDatabaseEffect } from "#src/database/database";
import { makeBattleReadBudget } from "#src/database/battle-read-budget";
import { migrateBattlelogDatabase } from "#src/database/migrate";
import { makeRedisStore } from "#src/infrastructure/redis-store";
import { unusedDeleteQueue } from "../../../test/battle-fixtures.js";
import { makeBattlelogOperations } from "#src/battles/battlelog-operations";
import { makeBattlelogTestBoundary } from "#src/http/battlelog-http";
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
  world: "luvia",
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
      const database = yield* drizzleDatabaseEffect;
      const redisApi = yield* Redis.Redis;

      const redis = makeRedisStore(
        redisApi,
        (operation) => runtime.runPromise(operation),
        { prefix: "battlelock-test" },
      );

      const cache = makeBattleAnalyticsCache(redis);
      const read = makeBattleReadBudget(database);

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
        makeBattlePagination(database, read),
        analytics,
        makeBattleListFilter(database),
        makeBattleMetadata(database, redis, read),
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
        metadata: makeBattleMetadata(database, redis, read),
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
  runtime = ManagedRuntime.make(
    Layer.merge(
      makePostgresLayer({ url: Redacted.make(postgres.getConnectionUri()) }),
      BunRedis.layer({
        url: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`,
      }),
    ),
  );
  await runtime.runPromise(migrateBattlelogDatabase);
  services = await createServices();
}, 60_000);

// Stopping two containers can take longer than the default hook timeout on CI runners.
afterAll(async () => {
  await runtime?.dispose();
  await pool?.end();
  await Promise.all([redisContainer?.stop(), postgres?.stop()]);
}, 60_000);

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
    // Allow the submission lookup while holding INSERTs past the Redis lock TTL.
    await blocker.query("BEGIN; LOCK TABLE battles IN SHARE MODE");
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
  let creation: Promise<Exit.Exit<unknown, unknown>> | undefined;

  try {
    // Allow the submission lookup while holding INSERTs past the Redis lock TTL.
    await blocker.query("BEGIN; LOCK TABLE battles IN SHARE MODE");
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
    expect(Exit.isFailure(await creation)).toBe(true);
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
    characters: [
      {
        id: "hero",
        name: "Hero",
        world: "world",
        icon: "",
        lvl: null,
        prof: null,
      },
    ],
  });
});

it("reports character metadata from the latest matching self warrior per owner and world", async () => {
  await pool.query(
    `INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('uc-level', 'owner', 'hero', 'Hero', 'world'), ('uc-world', 'owner', 'hero', 'Other Hero', 'other-world'), ('uc-empty', 'owner', 'empty', 'Empty', 'world'), ('uc-foreign', 'someone-else', 'foreign', 'Foreign', 'private-world')`,
  );

  const fixtures = [
    { id: "older", owner: "owner", createdAt: "2026-01-01", lvl: 90 },
    { id: "latest", owner: "owner", createdAt: "2026-02-01", lvl: 101 },
    { id: "foreign", owner: "someone-else", createdAt: "2026-03-01", lvl: 200 },
    {
      id: "other-world",
      owner: "owner",
      createdAt: "2026-04-01",
      lvl: 150,
      world: "other-world",
    },
    {
      id: "missing-self",
      owner: "owner",
      createdAt: "2026-05-01",
      lvl: 999,
      missingSelf: true,
    },
  ];

  for (const fixture of fixtures) {
    await pool.query(
      `INSERT INTO battles (id, "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", "hasFlee", statistics, "createdAt")
      VALUES ($1,$2,'account','hero',$4,10,'1v1','Hero','Enemy',1,2,false,'{}',$3)`,
      [fixture.id, fixture.owner, fixture.createdAt, fixture.world ?? "world"],
    );
    await pool.query(
      `INSERT INTO battle_warriors (id,"battleId","originalId",name,lvl,prof,icon,team,turns,ph)
      VALUES ($1,$2,$5,'Hero',$3,'w','hero.gif',1,1,0), ($4,$2,'enemy','Enemy',300,'m','enemy.gif',2,1,0)`,
      [
        `${fixture.id}-hero`,
        fixture.id,
        fixture.lvl,
        `${fixture.id}-enemy`,
        fixture.missingSelf ? "unrelated" : "hero",
      ],
    );
  }

  const { characters } = await runtime.runPromise(
    services.metadata.getUserCharacters("owner"),
  );

  expect([...characters].sort((a, b) => a.name.localeCompare(b.name))).toEqual([
    {
      id: "empty",
      name: "Empty",
      world: "world",
      icon: "",
      lvl: null,
      prof: null,
    },
    { id: "hero", name: "Hero", world: "world", icon: "", lvl: 101, prof: "w" },
    {
      id: "hero",
      name: "Other Hero",
      world: "other-world",
      icon: "",
      lvl: 150,
      prof: "w",
    },
  ]);
  expect(
    await runtime.runPromise(services.metadata.getUserWorlds("owner")),
  ).toEqual({
    worlds: ["other-world", "world"],
  });
});

it("coalesces concurrent analytics fills and retries factory failures without caching them", async () => {
  let calls = 0;
  const cache = services.cache;

  const read = () =>
    cache.getOrSetJson(
      "burst",
      "summary",
      () =>
        Effect.gen(function* () {
          calls++;
          yield* Effect.sleep("80 millis");

          return 42;
        }),
      Number,
    );

  const results = await Promise.all(
    Array.from({ length: 8 }, () => runtime.runPromise(read())),
  );

  expect(results).toEqual(Array(8).fill(42));
  expect(calls).toBe(1);
  const failure = { reason: "database failed" };
  let failures = 0;
  expect(
    await runtime.runPromise(
      cache
        .getOrSetJson(
          "burst",
          "failure",
          () =>
            Effect.suspend(() => {
              failures++;

              return Effect.fail(failure);
            }),
          Number,
        )
        .pipe(Effect.flip),
    ),
  ).toBe(failure);
  expect(failures).toBe(1);
  expect(
    await runtime.runPromise(
      cache.getOrSetJson("burst", "failure", () => Effect.succeed(7), Number),
    ),
  ).toBe(7);
});

it("does not retry a loader that rejects without an error value", async () => {
  let calls = 0;

  const results = await Promise.allSettled([
    services.redis.getOrSetJsonBestEffort({
      key: "undefined-failure",
      ttlSeconds: 30,
      codec: { stringify: JSON.stringify, parse: Number },
      factory: () => {
        calls++;

        return Promise.reject(undefined);
      },
    }),
  ]);

  expect(results).toEqual([{ status: "rejected", reason: undefined }]);
  expect(calls).toBe(1);
});

it("times out best-effort cache waiters without duplicating the active fill", async () => {
  const key = "slow-cache-fill";
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: result, resolve: finish } = Promise.withResolvers<number>();
  let calls = 0;

  const options = {
    key,
    ttlSeconds: 30,
    codec: { stringify: JSON.stringify, parse: Number },
    waitTimeoutMs: 60,
    waitIntervalMs: 10,
    factory: async () => {
      calls++;
      begin();

      return result;
    },
  };

  const owner = services.redis.getOrSetJsonBestEffort(options);

  try {
    await started;

    const waiters = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        services.redis.getOrSetJsonBestEffort(options),
      ),
    );

    for (const waiter of waiters) {
      expect(waiter.status).toBe("rejected");

      if (waiter.status === "rejected") {
        expect(waiter.reason).toBeInstanceOf(CacheFillTimeoutError);
      }
    }

    expect(calls).toBe(1);
  } finally {
    finish(42);
    await owner;
  }

  expect(await services.redis.get(key)).toBe("42");
});

it("prevents an expired cache owner from replacing its successor's cached result", async () => {
  const key = "expired-cache-fill";
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: result, resolve: finish } = Promise.withResolvers<number>();

  const options = {
    key,
    ttlSeconds: 30,
    lockTtlSeconds: 1,
    codec: { stringify: JSON.stringify, parse: Number },
  };

  const owner = services.redis.getOrSetJsonBestEffort({
    ...options,
    factory: async () => {
      begin();

      return result;
    },
  });

  try {
    await started;
    // Let the real Redis lease expire while the original query remains pending.
    await Bun.sleep(1_100);
    expect(
      await services.redis.getOrSetJsonBestEffort({
        ...options,
        factory: async () => 99,
      }),
    ).toBe(99);
  } finally {
    finish(42);
    expect(await owner).toBe(42);
  }

  expect(await services.redis.get(key)).toBe("99");
});

it("cancels a waiting best-effort reader without running its factory after lock release", async () => {
  const key = "cancelled-cache-waiter";
  const controller = new AbortController();
  await services.redis.setNX(`${key}:single-flight`, "owner", 10);
  let calls = 0;

  const reading = services.redis.getOrSetJsonBestEffort({
    key,
    ttlSeconds: 30,
    waitTimeoutMs: 500,
    waitIntervalMs: 10,
    signal: controller.signal,
    codec: { stringify: JSON.stringify, parse: Number },
    factory: async () => {
      calls++;

      return 42;
    },
  });

  const settled = Promise.allSettled([reading]);
  await Bun.sleep(30);
  controller.abort();
  expect((await settled)[0]?.status).toBe("rejected");
  await services.redis.del(`${key}:single-flight`);
  await Bun.sleep(30);
  expect(calls).toBe(0);
  expect(await services.redis.get(key)).toBeNull();
});

it("interrupts a coalesced analytics factory and permits a subsequent fill", async () => {
  const controller = new AbortController();
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: canceled, resolve: cancel } = Promise.withResolvers<void>();

  const reading = Effect.runPromiseExit(
    services.cache.getOrSetJson(
      "abort",
      "summary",
      () =>
        Effect.sync(begin).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Effect.sync(cancel)),
        ),
      Number,
    ),
    { signal: controller.signal },
  );

  await started;
  controller.abort();
  expect(Exit.hasInterrupts(await reading)).toBe(true);
  await canceled;
  const generation = await services.redis.get("battle-cache-generation:abort");
  const key = `battle-cache:v2:abort:${generation}:summary`;
  expect(await services.redis.get(key)).toBeNull();
  expect(
    await runtime.runPromise(
      services.cache.getOrSetJson(
        "abort",
        "summary",
        () => Effect.succeed(9),
        Number,
      ),
    ),
  ).toBe(9);
  expect(await services.redis.get(`${key}:single-flight`)).toBeNull();
  expect(await services.redis.get(key)).toBe("9");
});

it("searches only owned warriors with trimmed ILIKE and preserves distinct names and highest text ID", async () => {
  await pool.query(`INSERT INTO battles (id,"userId","accountId","characterId",world,duration,type,winner,loser,"winningTeam","losingTeam",statistics,"createdAt") VALUES
    ('old','owner','account','hero','world',10,'1v1','Hero','Enemy',1,2,'{}','2026-01-01'),
    ('new','owner','account','hero','world',10,'1v1','Hero','Enemy',1,2,'{}','2026-02-01'),
    ('foreign','someone-else','account','hero','world',10,'1v1','Hero','Enemy',1,2,'{}','2026-03-01')`);
  await pool.query(`INSERT INTO battle_warriors (id,"battleId","originalId",name,lvl,prof,icon,team,turns,ph) VALUES
    ('9','old','hero','Alpha',90,'w','old.gif',1,1,0),
    ('10','new','hero','Alpha',100,'m','new.gif',1,1,0),
    ('case','new','hero','alpha',110,'p','case.gif',1,1,0),
    ('foreign','foreign','hero','Alpha',999,'m','private.gif',1,1,0),
    ('foreign-only','foreign','hero','Alpine',999,'m','private.gif',1,1,0)`);

  const expected = [
    { name: "Alpha", lvl: 90, prof: "w", icon: "old.gif" },
    { name: "alpha", lvl: 110, prof: "p", icon: "case.gif" },
  ];

  expect(
    await runtime.runPromise(
      services.metadata.searchWarriors("  aLp  ", "owner"),
    ),
  ).toEqual({ warriors: expected });
  expect(
    await runtime.runPromise(
      services.metadata.searchWarriors("Al_ha", "owner"),
    ),
  ).toEqual({ warriors: expected });
  expect(
    await runtime.runPromise(
      services.metadata.searchWarriors("Al%ha", "owner"),
    ),
  ).toEqual({ warriors: expected });
  expect(
    await runtime.runPromise(services.metadata.searchWarriors(" a ", "owner")),
  ).toEqual({ warriors: [] });

  await pool.query(`INSERT INTO battle_warriors (id,"battleId","originalId",name,lvl,prof,icon,team,turns,ph)
    SELECT 'ordered-' || n, 'new', 'hero', 'Ordered ' || lpad(n::text,2,'0'), 100, 'w', 'hero.gif', 1, 1, 0
    FROM generate_series(12,1,-1) n`);

  const ordered = await runtime.runPromise(
    services.metadata.searchWarriors("Ordered", "owner"),
  );

  expect(ordered.warriors.map((warrior) => warrior.name)).toEqual([
    "Ordered 01",
    "Ordered 02",
    "Ordered 03",
    "Ordered 04",
    "Ordered 05",
    "Ordered 06",
    "Ordered 07",
    "Ordered 08",
    "Ordered 09",
    "Ordered 10",
  ]);
});

it("applies combined dashboard filters and counts only the requesting owner's matching battles", async () => {
  await pool.query(
    `INSERT INTO user_characters (id,"userId","characterId",name,world) VALUES ('dashboard-hero','owner','hero','Hero','world')`,
  );

  const fixtures = [
    { id: "match-a" },
    { id: "match-b" },
    { id: "foreign", owner: "someone-else" },
    { id: "loss", winningTeam: 2 },
    { id: "flee", hasFlee: true },
    { id: "low", lvl: 79 },
    { id: "high", lvl: 121 },
    { id: "other-name", name: "Other" },
  ];

  for (const fixture of fixtures) {
    await pool.query(
      `INSERT INTO battles (id,"userId","accountId","characterId",world,duration,type,winner,loser,"winningTeam","losingTeam","hasFlee",statistics,"createdAt")
      VALUES ($1,$2,'account','hero','world',10,'1v1','Hero','Enemy',$3,$4,$5,'{}','2026-01-01')`,
      [
        fixture.id,
        fixture.owner ?? "owner",
        fixture.winningTeam ?? 1,
        fixture.winningTeam === 2 ? 1 : 2,
        fixture.hasFlee ?? false,
      ],
    );
    await pool.query(
      `INSERT INTO battle_warriors (id,"battleId","originalId",name,lvl,prof,icon,team,turns,ph)
      VALUES ($1,$2,'hero','Hero',100,'w','hero.gif',1,1,0), ($3,$2,'enemy',$4,$5,'m','enemy.gif',2,1,0)`,
      [
        `${fixture.id}-hero`,
        fixture.id,
        `${fixture.id}-enemy`,
        fixture.name ?? "Enemy",
        fixture.lvl ?? 100,
      ],
    );
  }

  const result = await runtime.runPromise(
    services.battles.getDashboardBattles(
      {
        result: ["won"],
        minLevel: 80,
        maxLevel: 120,
        search: "eNeM",
        size: 1,
        sortOrder: "asc",
        includeTotal: true,
        userId: "someone-else",
      },
      "owner",
    ),
  );

  expect(result.battles.map((battle) => battle.id)).toEqual(["match-a"]);
  expect(result.pagination.total).toBe(2);
  expect(result.pagination.hasNext).toBe(true);
});

it("rolls back the battle and skips object upload when participant storage fails", async () => {
  await pool.query(`
    CREATE FUNCTION reject_test_warrior() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Participant storage unavailable'; END;
    $$;
    CREATE TRIGGER reject_test_warrior BEFORE INSERT ON battle_warriors
    FOR EACH ROW EXECUTE FUNCTION reject_test_warrior();
  `);

  try {
    const result = await runtime.runPromise(
      Effect.exit(services.battles.createBattle({ data, userId })),
    );

    expect(Exit.isFailure(result)).toBe(true);
    expect((await pool.query("SELECT id FROM battles")).rows).toEqual([]);
    expect((await pool.query("SELECT id FROM battle_warriors")).rows).toEqual(
      [],
    );
    expect(services.uploads.size).toBe(0);
  } finally {
    await pool.query(`
      DROP TRIGGER reject_test_warrior ON battle_warriors;
      DROP FUNCTION reject_test_warrior();
    `);
  }

  const retried = await runtime.runPromise(
    services.battles.createBattle({ data, userId }),
  );

  expect((await pool.query("SELECT id FROM battles")).rows).toEqual([
    { id: retried.battleId },
  ]);
  expect(
    (await pool.query("SELECT id FROM battle_warriors")).rows,
  ).toHaveLength(2);
  expect(services.uploads.has(retried.battleId)).toBe(true);
});

it("keeps HTTP submissions durable and retry-safe during concurrent catalog reads", async () => {
  const boundary = makeBattlelogTestBoundary(
    makeBattlelogOperations(
      services.battles,
      services.analytics,
      unusedDeleteQueue,
    ),
  );

  const headers = {
    "x-auth-user-id": userId,
    "x-auth-discord-id": "discord",
    "content-type": "application/json",
  };

  const submit = () =>
    boundary.handler(
      new Request("http://battlelog.test/battles", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      }),
    );

  try {
    const [submitted, ...reads] = await Promise.all([
      submit(),
      ...Array.from({ length: 20 }, (_, index) =>
        boundary.handler(
          new Request(
            `http://battlelog.test/battles/@me/warriors/search?q=${index % 2 === 0 ? "first" : "second"}`,
            { headers },
          ),
        ),
      ),
    ]);

    expect(submitted.status).toBe(201);
    expect(reads.map((response) => response.status)).toEqual(
      Array(20).fill(200),
    );
    const created = await submitted.json();
    const retried = await submit();
    expect(retried.status).toBe(201);
    expect(await retried.json()).toEqual(created);
    expect(
      (await pool.query('SELECT id FROM battles WHERE "userId" = $1', [userId]))
        .rows,
    ).toEqual([{ id: created.battleId }]);
    expect(
      (
        await pool.query(
          'SELECT "originalId", name, team, "damageDealt", "damageTaken", stats, "statsVersion" FROM battle_warriors WHERE "battleId" = $1 ORDER BY name',
          [created.battleId],
        )
      ).rows,
    ).toEqual([
      expect.objectContaining({
        originalId: "220",
        name: "first",
        team: 1,
        damageDealt: 10,
        statsVersion: 1,
        stats: expect.objectContaining({ damageDealt: 10 }),
      }),
      expect.objectContaining({
        originalId: "7533",
        name: "second",
        team: 2,
        damageTaken: 10,
        statsVersion: 1,
        stats: expect.objectContaining({ damageTaken: 10 }),
      }),
    ]);
    expect(services.uploads.has(created.battleId)).toBe(true);
  } finally {
    await boundary.dispose();
  }
});
