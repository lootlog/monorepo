import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { fileURLToPath } from "node:url";
import { relations } from "#src/database/relations";
import {
  unusedBattleAnalytics,
  unusedDeleteQueue,
} from "../../../test/battle-fixtures.js";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Effect, ManagedRuntime, Schema } from "effect";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import { setTimeout as sleep } from "node:timers/promises";
import { Logger } from "#src/infrastructure/logger";
import type { JsonCodec } from "#src/infrastructure/redis-store";
import { makeBattlelogOperations } from "#src/battles/battlelog-operations";
import { makeBattles, type Battles } from "#src/battles/battles.service";
import { makeBattlelogTestBoundary } from "#src/http/battlelog-http";

type TestApplication = ReturnType<typeof makeBattlelogTestBoundary> & {
  battles: Battles;
};

const requestJson = async <S extends Schema.ConstraintDecoder<unknown>>(
  handler: TestApplication["handler"],
  method: "GET" | "POST",
  path: string,
  schema: S,
  expectedStatus: number,
  body?: typeof Schema.Json.Type,
) => {
  const response = await handler(
    new Request(`http://battlelog.test${path}`, {
      method,
      headers: { "content-type": "application/json", ...authHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(expectedStatus);
  return { body: Schema.decodeUnknownSync(schema)(await response.json()) };
};
const postBattle = (
  handler: TestApplication["handler"],
  body: typeof Schema.Json.Type,
) =>
  requestJson(
    handler,
    "POST",
    "/battles",
    Schema.Struct({ battleId: Schema.String }),
    201,
    body,
  );
const getBattle = (handler: TestApplication["handler"], path: string) =>
  requestJson(handler, "GET", path, BattleResponseSchemas.battle, 200);

const warriors = {
  "220": {
    icon: "cashtelan.gif",
    lvl: 300,
    name: "cashtelan",
    originalId: 220,
    prof: "p",
    team: 1,
  },
  "7533": {
    icon: "keukta.gif",
    lvl: 300,
    name: "keukta",
    originalId: 7533,
    prof: "w",
    team: 2,
  },
};

const moves = [
  ...Array.from(
    { length: 12 },
    (_, index) => `220=100;7533=90;+dmg=${index + 1};-dmg=${index + 1}`,
  ),
  "0;0;winner=cashtelan",
  "0;0;loser=keukta",
];

const battleEvent = {
  ev: 1_785_091_976.6,
  f: { endBattle: 1, init: "1", m: moves, w: warriors },
};

const incrementalBattleEvents = [
  {
    ev: 1_785_091_976.6,
    f: { init: "1", m: moves.slice(0, 6), w: warriors },
  },
  {
    ev: 1_785_091_976.9,
    f: { endBattle: 1, m: moves.slice(6) },
  },
];

const battleContext = {
  accountId: "account-1",
  characterId: "220",
  world: "pandora",
};

const authHeaders = {
  "x-auth-discord-id": "discord-1",
  "x-auth-user-id": "user-1",
};

const createDatabaseBoundary = async ({
  beforeTransaction,
}: { beforeTransaction?: () => Promise<void> } = {}) => {
  const runtime = ManagedRuntime.make(PgliteClient.layer({}));
  const database = await runtime.runPromise(makeWithDefaults({ relations }));
  await runtime.runPromise(
    migrate(database, {
      migrationsFolder: fileURLToPath(
        new URL("../../../drizzle", import.meta.url),
      ),
    }),
  );
  let transactionCount = 0;
  type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
  const transaction = <A, E, R>(
    factory: (transaction: Transaction) => Effect.Effect<A, E, R>,
  ) =>
    Effect.gen(function* () {
      transactionCount += 1;
      if (beforeTransaction) yield* Effect.promise(beforeTransaction);
      return yield* database.transaction(factory);
    });
  return {
    service: {
      db: {
        query: database.query,
        select: database.select.bind(database),
        delete: database.delete.bind(database),
        update: database.update.bind(database),
        transaction,
      },
    },
    getStoredBattles: () =>
      runtime.runPromise(
        database.query.battles.findMany({ with: { warriors: true } }),
      ),
    getTransactionCount: () => transactionCount,
    dispose: () => runtime.dispose(),
  };
};

const createRedisBoundary = ({
  now = Date.now,
}: {
  now?: () => number;
} = {}) => {
  const values = new Map<string, { expiresAt: number | null; value: string }>();
  const locks = new Map<string, { expiresAt: number | null; token: string }>();

  const boundary = {
    del: mock(async (key: string) => (values.delete(key) ? 1 : 0)),
    deleteByPattern: mock(),
    eval: mock(
      async (_script: string, keys: string[], args: Array<string | number>) => {
        const [key] = keys;
        const [token, ttlSeconds] = args;
        const lock = key ? locks.get(key) : undefined;
        if (
          key &&
          lock &&
          lock.token === token &&
          (lock.expiresAt === null || lock.expiresAt > now())
        ) {
          if (ttlSeconds !== undefined) {
            lock.expiresAt = now() + Number(ttlSeconds) * 1_000;
            return 1;
          }
          locks.delete(key);
          return 1;
        }
        return 0;
      },
    ),
    readCachedJson: mock(async (key: string) => {
      const cached = values.get(key);
      if (!cached) return null;
      if (cached.expiresAt !== null && cached.expiresAt <= now()) {
        values.delete(key);
        return null;
      }
      return cached.value;
    }),
    setJson: <T>(key: string, value: T, ttlSeconds?: number) => {
      values.set(key, {
        expiresAt: ttlSeconds ? now() + ttlSeconds * 1_000 : null,
        value: JSON.stringify(value),
      });
      return Promise.resolve();
    },
    setNX: mock(async (key: string, token: string, ttlSeconds?: number) => {
      const existingLock = locks.get(key);
      if (
        existingLock &&
        (existingLock.expiresAt === null || existingLock.expiresAt > now())
      ) {
        return false;
      }
      locks.set(key, {
        expiresAt: ttlSeconds ? now() + ttlSeconds * 1_000 : null,
        token,
      });
      return true;
    }),
  };
  return {
    ...boundary,
    getJson: async <T>(key: string, codec: JsonCodec<T>): Promise<T | null> => {
      const serialized = await boundary.readCachedJson(key);
      return serialized === null ? null : codec.parse(serialized);
    },
  };
};

const createTestApplication = async ({
  beforeTransaction,
  redis = createRedisBoundary(),
  waitTimeoutMs = 30,
}: {
  beforeTransaction?: () => Promise<void>;
  redis?: ReturnType<typeof createRedisBoundary>;
  waitTimeoutMs?: number;
} = {}) => {
  const database = await createDatabaseBoundary({ beforeTransaction });
  const drizzle = database.service.db;
  const redisService = redis;
  const analyticsService = {
    ...unusedBattleAnalytics,
    invalidateAnalyticsCache: mock(() => Effect.void),
  };
  const battlesModule = makeBattles(
    drizzle,
    {
      uploadBattleData: mock(),
      getBattleData: mock(),
      deleteBattleData: mock(),
    },
    redisService,
    { paginateBattles: () => Effect.die("Unexpected pagination") },
    analyticsService,
    { buildFilterConditions: () => Effect.die("Unexpected list filter") },
    {
      upsertUserCharacter: mock(() => Effect.void),
      getUserCharacters: () => Effect.die("Unexpected character list"),
      getUserWorlds: () => Effect.die("Unexpected world list"),
      searchWarriors: () => Effect.die("Unexpected warrior search"),
    },
    {
      cacheTtlSeconds: 10,
      lockRefreshIntervalMs: 10,
      lockTtlSeconds: 0.03,
      waitIntervalMs: 1,
      waitTimeoutMs,
    },
  );
  const battlesService = battlesModule;
  const boundary = makeBattlelogTestBoundary(
    makeBattlelogOperations(battlesModule, analyticsService, unusedDeleteQueue),
  );
  const app: TestApplication = {
    ...boundary,
    dispose: async () => {
      try {
        await boundary.dispose();
      } finally {
        await database.dispose();
      }
    },
    battles: battlesService,
  };
  return { app, database };
};

describe("battle creation deduplication", () => {
  let app: TestApplication;

  afterEach(async () => {
    try {
      await app?.dispose();
    } finally {
      mock.restore();
    }
  });

  it("stores one canonical battle for duplicated incremental and compact payloads", async () => {
    const testApplication = await createTestApplication({
      waitTimeoutMs: 1_000,
    });
    app = testApplication.app;

    const [firstResponse, secondResponse] = await Promise.all([
      postBattle(app.handler, {
        ...battleContext,
        submissionId: "incremental-submission",
        events: [battleEvent, battleEvent],
      }),
      postBattle(app.handler, {
        ...battleContext,
        submissionId: "compact-submission",
        events: [{ ...battleEvent, ev: 1_785_091_976.9 }],
      }),
    ]);

    expect(secondResponse.body).toEqual(firstResponse.body);

    const battleResponse = await getBattle(
      app.handler,
      `/battles/${firstResponse.body.battleId}`,
    );
    const cashtelan = battleResponse.body.warriors.find(
      (warrior: { name: string }) => warrior.name === "cashtelan",
    );

    expect(cashtelan.turns).toBe(12);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
  });

  it("preserves the incremental duration when a compact replay arrives first", async () => {
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const compactResponse = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "compact-duration-submission",
      events: [battleEvent],
    });
    const incrementalResponse = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "incremental-duration-submission",
      events: incrementalBattleEvents,
    });

    expect(incrementalResponse.body).toEqual(compactResponse.body);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
    expect(
      Number((await testApplication.database.getStoredBattles())[0]?.duration),
    ).toBeCloseTo(0.3, 5);
  });

  it("keeps equivalent creation single-flight after the initial lock TTL", async () => {
    let currentTime = 0;
    const redis = createRedisBoundary({ now: () => currentTime });
    let releaseTransaction!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });
    let markTransactionStarted!: () => void;
    const transactionStarted = new Promise<void>((resolve) => {
      markTransactionStarted = resolve;
    });
    const testApplication = await createTestApplication({
      redis,
      beforeTransaction: async () => {
        markTransactionStarted();
        await transactionGate;
      },
    });
    app = testApplication.app;
    const battlesService = app.battles;
    const firstCreation = Effect.runPromise(
      battlesService.createBattle({
        data: {
          ...battleContext,
          submissionId: "long-running-first",
          events: [battleEvent],
        },
        userId: "user-1",
      }),
    );

    await transactionStarted;
    currentTime = 10;
    while (redis.eval.mock.calls.length === 0) {
      await sleep(1);
    }
    currentTime = 31;

    const secondCreation = Effect.runPromise(
      battlesService.createBattle({
        data: {
          ...battleContext,
          submissionId: "long-running-second",
          events: [battleEvent],
        },
        userId: "user-1",
      }),
    );
    await sleep(0);
    const transactionCallsDuringContention =
      testApplication.database.getTransactionCount();

    releaseTransaction();
    await sleep(1);
    const [firstResult, secondResult] = await Promise.all([
      firstCreation,
      secondCreation,
    ]);

    expect(secondResult).toEqual(firstResult);
    expect(transactionCallsDuringContention).toBe(1);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
  });

  it("waits for an in-flight creation to finish after losing the lock", async () => {
    spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    let releaseTransaction!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });
    let markTransactionStarted!: () => void;
    const transactionStarted = new Promise<void>((resolve) => {
      markTransactionStarted = resolve;
    });
    const redis = createRedisBoundary();
    redis.eval.mockResolvedValue(0);
    const testApplication = await createTestApplication({
      beforeTransaction: async () => {
        markTransactionStarted();
        await transactionGate;
      },
      redis,
    });
    app = testApplication.app;
    const battlesService = app.battles;
    let creationSettled = false;
    const creationOutcome = Effect.runPromise(
      battlesService.createBattle({
        data: {
          ...battleContext,
          submissionId: "lost-lock",
          events: [battleEvent],
        },
        userId: "user-1",
      }),
    )
      .then(
        () => "resolved",
        () => "rejected",
      )
      .finally(() => {
        creationSettled = true;
      });

    await transactionStarted;
    await sleep(10);
    const settledBeforeTransactionFinished = creationSettled;

    releaseTransaction();
    await sleep(0);

    await expect(creationOutcome).resolves.toBe("rejected");
    expect(settledBeforeTransactionFinished).toBe(false);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
  });

  it("preserves separate battle events that do not have event ids", async () => {
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const response = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "events-without-ids",
      events: [
        {
          f: {
            init: "1",
            m: moves.slice(0, 6),
            w: warriors,
          },
        },
        {
          f: {
            endBattle: 1,
            m: moves.slice(6),
          },
        },
      ],
    });

    const battleResponse = await getBattle(
      app.handler,
      `/battles/${response.body.battleId}`,
    );
    const cashtelan = battleResponse.body.warriors.find(
      (warrior: { name: string }) => warrior.name === "cashtelan",
    );

    expect(cashtelan.turns).toBe(12);
  });

  it("preserves distinct battle events that share an event id", async () => {
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const response = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "events-with-repeated-id",
      events: [
        {
          ev: 1_785_091_976.7,
          f: {
            init: "1",
            m: moves.slice(0, 6),
            w: warriors,
          },
        },
        {
          ev: 1_785_091_976.7,
          f: {
            endBattle: 1,
            m: moves.slice(6),
          },
        },
      ],
    });

    const battleResponse = await getBattle(
      app.handler,
      `/battles/${response.body.battleId}`,
    );
    const cashtelan = battleResponse.body.warriors.find(
      (warrior: { name: string }) => warrior.name === "cashtelan",
    );

    expect(cashtelan.turns).toBe(12);
  });

  it("allows an identical battle after the deduplication window", async () => {
    const dateNow = spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-07-26T18:52:57.000Z"),
    );
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const firstResponse = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "first-real-battle",
      events: [battleEvent],
    });
    dateNow.mockReturnValue(Date.parse("2026-07-26T18:53:07.001Z"));
    const secondResponse = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "second-real-battle",
      events: [{ ...battleEvent, ev: 1_785_091_986.7 }],
    });

    expect(secondResponse.body.battleId).not.toBe(firstResponse.body.battleId);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(2);
    dateNow.mockRestore();
  });

  it("returns 503 without storing a battle when Redis is unavailable", async () => {
    spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.readCachedJson.mockRejectedValue(new Error("Redis unavailable"));
    const testApplication = await createTestApplication({ redis });
    app = testApplication.app;

    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 503, {
      ...battleContext,
      submissionId: "redis-failure",
      events: [battleEvent],
    });

    expect(await testApplication.database.getStoredBattles()).toHaveLength(0);
  });

  it("returns 503 without storing a battle when the deduplication lock times out", async () => {
    spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.readCachedJson.mockResolvedValue(null);
    redis.setNX.mockResolvedValue(false);
    const testApplication = await createTestApplication({ redis });
    app = testApplication.app;

    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 503, {
      ...battleContext,
      submissionId: "lock-timeout",
      events: [battleEvent],
    });

    expect(await testApplication.database.getStoredBattles()).toHaveLength(0);
  });
});
