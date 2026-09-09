import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { fileURLToPath } from "node:url";
import { relations } from "#src/database/relations";
import {
  unusedBattleAnalytics,
  unusedDeleteQueue,
} from "../../../test/battle-fixtures.js";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { Effect, ManagedRuntime, Schema } from "effect";
import { ConnectionError, SqlError } from "effect/unstable/sql/SqlError";
import type { RawBattleData } from "#src/battles/battle-service";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import { battles } from "#src/database/schema";
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
  userId = "user-1",
) => {
  const response = await handler(
    new Request(`http://battlelog.test${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...authHeaders,
        "x-auth-user-id": userId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(expectedStatus);
  return { body: Schema.decodeUnknownSync(schema)(await response.json()) };
};
const postBattle = (
  handler: TestApplication["handler"],
  body: typeof Schema.Json.Type,
  userId = "user-1",
) =>
  requestJson(
    handler,
    "POST",
    "/battles",
    Schema.Struct({ battleId: Schema.String }),
    201,
    body,
    userId,
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

// Compile PostgreSQL WASM and apply migrations once, outside individual test budgets.
const databaseRuntime = ManagedRuntime.make(PgliteClient.layer({}));
const databaseEffect = makeWithDefaults({ relations });
let sharedDatabase: Effect.Success<typeof databaseEffect>;

const createDatabaseBoundary = ({
  beforeTransaction,
}: { beforeTransaction?: () => Promise<void> } = {}) => {
  const database = sharedDatabase;
  let transactionCount = 0;
  type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
  const transaction = <A, E, R>(
    factory: (transaction: Transaction) => Effect.Effect<A, E, R>,
  ) =>
    Effect.gen(function* () {
      transactionCount += 1;
      if (beforeTransaction)
        yield* Effect.tryPromise({
          try: beforeTransaction,
          catch: (cause) =>
            new SqlError({ reason: new ConnectionError({ cause }) }),
        });
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
      databaseRuntime.runPromise(
        database.query.battles.findMany({ with: { warriors: true } }),
      ),
    getTransactionCount: () => transactionCount,
  };
};

const createRedisBoundary = ({
  now = Date.now,
  onRenew = () => {},
  onContention = () => {},
}: {
  now?: () => number;
  onRenew?: () => void;
  onContention?: () => void;
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
            onRenew();
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
        onContention();
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

const createTestApplication = ({
  beforeTransaction,
  redis = createRedisBoundary(),
  waitTimeoutMs = 10_000,
  lockTtlSeconds = 30,
  beforeUpload,
}: {
  beforeTransaction?: () => Promise<void>;
  redis?: ReturnType<typeof createRedisBoundary>;
  waitTimeoutMs?: number;
  lockTtlSeconds?: number;
  beforeUpload?: () => Promise<void>;
} = {}) => {
  const database = createDatabaseBoundary({ beforeTransaction });
  const drizzle = database.service.db;
  const redisService = redis;
  const analyticsService = {
    ...unusedBattleAnalytics,
    invalidateAnalyticsCache: mock(() => Effect.void),
  };
  const objects = new Map<string, RawBattleData>();
  const objectStorage = {
    uploadBattleData: mock(async (battleId: string, data: RawBattleData) => {
      await beforeUpload?.();
      objects.set(battleId, data);
    }),
    getBattleData: async <TData>(
      battleId: string,
      decodeJson: (value: string) => TData,
    ) => decodeJson(JSON.stringify(objects.get(battleId))),
    deleteBattleData: async (battleId: string) => {
      objects.delete(battleId);
    },
  };
  const battlesModule = makeBattles(
    drizzle,
    objectStorage,
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
      lockTtlSeconds,
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
    battles: battlesService,
  };
  return { app, database, objects, objectStorage };
};

describe("battle creation deduplication", () => {
  let app: TestApplication;

  beforeAll(async () => {
    sharedDatabase = await databaseRuntime.runPromise(databaseEffect);
    await databaseRuntime.runPromise(
      migrate(sharedDatabase, {
        migrationsFolder: fileURLToPath(
          new URL("../../../drizzle", import.meta.url),
        ),
      }),
    );
  }, 60_000);

  beforeEach(async () => {
    await databaseRuntime.runPromise(sharedDatabase.delete(battles));
  });

  afterAll(async () => {
    await databaseRuntime.dispose();
  });

  afterEach(async () => {
    try {
      await app?.dispose();
    } finally {
      mock.restore();
    }
  });

  it("scopes submission IDs to their authenticated owner", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "shared-submission",
      events: [battleEvent],
    };
    const first = await postBattle(app.handler, data);
    const original = testApplication.objects.get(first.body.battleId);
    const second = await postBattle(app.handler, data, "user-2");

    expect(second.body.battleId).not.toBe(first.body.battleId);
    expect(testApplication.objects.get(first.body.battleId)).toEqual(original);
    const stored = await testApplication.database.getStoredBattles();
    expect(stored.map((battle) => battle.userId).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
  });

  it("rejects changed payloads for an accepted submission without changing its data", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "immutable-submission",
      events: [battleEvent],
    };
    const first = await postBattle(app.handler, data);
    const original = testApplication.objects.get(first.body.battleId);
    const stored = await testApplication.database.getStoredBattles();
    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 400, {
      ...data,
      world: "another-world",
    });

    expect(await testApplication.database.getStoredBattles()).toEqual(stored);
    expect(testApplication.objects.get(first.body.battleId)).toEqual(original);
    expect(
      testApplication.objectStorage.uploadBattleData,
    ).toHaveBeenCalledTimes(1);
  });

  it("resolves the owner's durable submission after the semantic cache expires", async () => {
    const redis = createRedisBoundary();
    const testApplication = createTestApplication({ redis });
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "durable-retry",
      events: [battleEvent],
    };
    const first = await postBattle(app.handler, data);
    redis.readCachedJson.mockResolvedValue(null);
    await databaseRuntime.runPromise(
      sharedDatabase.update(battles).set({ createdAt: new Date(0) }),
    );
    const retry = await postBattle(app.handler, data);

    expect(retry.body).toEqual(first.body);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
    expect(testApplication.database.getTransactionCount()).toBe(1);
  });

  it("prefers a durable submission over a newer equivalent battle in the cache", async () => {
    let now = 0;
    const testApplication = createTestApplication({
      redis: createRedisBoundary({ now: () => now }),
    });
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "older-submission",
      events: [battleEvent],
    };
    const first = await postBattle(app.handler, data);
    now = 11_000;
    await databaseRuntime.runPromise(
      sharedDatabase.update(battles).set({ createdAt: new Date(0) }),
    );
    const newer = await postBattle(app.handler, {
      ...data,
      submissionId: "newer-submission",
    });
    expect(newer.body.battleId).not.toBe(first.body.battleId);

    const retry = await postBattle(app.handler, data);
    expect(retry.body).toEqual(first.body);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(2);
  });

  it("returns one battle when separate writers race with the same submission", async () => {
    const transactionsReady = Promise.withResolvers<void>();
    let transactions = 0;
    const beforeTransaction = async () => {
      if (++transactions === 2) transactionsReady.resolve();
      await transactionsReady.promise;
    };
    const firstWriter = createTestApplication({ beforeTransaction });
    const secondWriter = createTestApplication({ beforeTransaction });
    app = firstWriter.app;
    try {
      const data = {
        ...battleContext,
        submissionId: "parallel-retry",
        events: [battleEvent],
      };
      const [first, second] = await Promise.all([
        postBattle(firstWriter.app.handler, data),
        postBattle(secondWriter.app.handler, data),
      ]);
      expect(second.body).toEqual(first.body);
      expect(await firstWriter.database.getStoredBattles()).toHaveLength(1);
      expect(firstWriter.objects.has(first.body.battleId)).toBe(true);
      expect(secondWriter.objects.has(first.body.battleId)).toBe(true);
    } finally {
      await secondWriter.app.dispose();
    }
  });

  it("rejects a concurrent changed payload that loses the submission constraint race", async () => {
    const transactionsReady = Promise.withResolvers<void>();
    let transactions = 0;
    const testApplication = createTestApplication({
      beforeTransaction: async () => {
        if (++transactions === 2) transactionsReady.resolve();
        await transactionsReady.promise;
      },
    });
    app = testApplication.app;
    const submit = (world: string) =>
      app.handler(
        new Request("http://battlelog.test/battles", {
          method: "POST",
          headers: { "content-type": "application/json", ...authHeaders },
          body: JSON.stringify({
            ...battleContext,
            world,
            submissionId: "racing-submission",
            events: [battleEvent],
          }),
        }),
      );
    const responses = await Promise.all([
      submit("first-world"),
      submit("second-world"),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    const [stored] = await testApplication.database.getStoredBattles();
    if (!stored) throw new Error("Missing accepted battle");
    expect(testApplication.objects.get(stored.id)?.rawData.world).toBe(
      stored.world,
    );
    expect(
      testApplication.objectStorage.uploadBattleData,
    ).toHaveBeenCalledTimes(1);
  });

  it("retains legacy submission IDs without replacing unverifiable payloads", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "legacy-submission",
      events: [battleEvent],
    };
    const first = await postBattle(app.handler, data);
    await databaseRuntime.runPromise(
      sharedDatabase.update(battles).set({ semanticFingerprint: null }),
    );
    const original = testApplication.objects.get(first.body.battleId);
    const retry = await postBattle(app.handler, { ...data, world: "changed" });

    expect(retry.body).toEqual(first.body);
    expect(testApplication.objects.get(first.body.battleId)).toEqual(original);
    expect(
      testApplication.objectStorage.uploadBattleData,
    ).toHaveBeenCalledTimes(1);
  });

  it("does not recover another owner's submission after a database outage", async () => {
    const redis = createRedisBoundary();
    let failTransaction = false;
    const testApplication = createTestApplication({
      redis,
      beforeTransaction: async () => {
        if (failTransaction) throw new Error("Database unavailable");
      },
    });
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "outage-retry",
      events: [battleEvent],
    };
    await postBattle(app.handler, data);
    redis.readCachedJson.mockResolvedValue(null);
    await databaseRuntime.runPromise(
      sharedDatabase.update(battles).set({ createdAt: new Date(0) }),
    );
    failTransaction = true;
    await requestJson(
      app.handler,
      "POST",
      "/battles",
      Schema.Unknown,
      500,
      data,
      "user-2",
    );
    expect(
      testApplication.objectStorage.uploadBattleData,
    ).toHaveBeenCalledTimes(1);
  });

  it("retries an unfinished object upload without duplicating the database record", async () => {
    let failUpload = true;
    const testApplication = createTestApplication({
      beforeUpload: async () => {
        if (failUpload) throw new Error("Object storage unavailable");
      },
    });
    app = testApplication.app;
    const data = {
      ...battleContext,
      submissionId: "upload-retry",
      events: [battleEvent],
    };
    await requestJson(
      app.handler,
      "POST",
      "/battles",
      Schema.Unknown,
      500,
      data,
    );
    const [stored] = await testApplication.database.getStoredBattles();
    failUpload = false;
    const retry = await postBattle(app.handler, data);

    expect(retry.body.battleId).toBe(stored?.id);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
    expect(testApplication.objects.has(retry.body.battleId)).toBe(true);
  });

  it("projects public battle metadata to the declared response fields", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;
    const { body } = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "private-idempotency-key",
      events: [battleEvent],
    });
    await databaseRuntime.runPromise(
      sharedDatabase.update(battles).set({ public: true }),
    );
    const response = await app.handler(
      new Request(`http://battlelog.test/battles/public/${body.battleId}`),
    );
    expect(response.status).toBe(200);
    const serialized = await response.text();
    expect(serialized).not.toContain("submissionId");
    expect(serialized).not.toContain("semanticFingerprint");
    expect(serialized).not.toContain("statsVersion");
    expect(serialized).not.toContain('"stats":');
    const battle = Schema.decodeUnknownSync(BattleResponseSchemas.battle)(
      JSON.parse(serialized),
    );
    expect(battle.id).toBe(body.battleId);
    expect(battle.warriors).toHaveLength(2);

    const originalRaw = testApplication.objects.get(body.battleId);
    if (!originalRaw) throw new Error("Missing battle object");
    testApplication.objects.set(body.battleId, {
      ...originalRaw,
      rawData: {
        ...originalRaw.rawData,
        submissionId: "private-idempotency-key",
      },
    });
    const rawResponse = await app.handler(
      new Request(`http://battlelog.test/battles/public/${body.battleId}/raw`),
    );
    expect(rawResponse.status).toBe(200);
    const rawJson = await rawResponse.text();
    expect(rawJson).not.toContain("submissionId");
    expect(
      Schema.decodeUnknownSync(BattleResponseSchemas.raw)(JSON.parse(rawJson))
        .battleId,
    ).toBe(body.battleId);

    const timelineResponse = await app.handler(
      new Request(
        `http://battlelog.test/battles/public/${body.battleId}/timeline`,
      ),
    );
    expect(timelineResponse.status).toBe(200);
    const timelineJson = await timelineResponse.text();
    expect(timelineJson).not.toContain("statsVersion");
    expect(timelineJson).not.toContain('"stats":');
    expect(
      Schema.decodeUnknownSync(BattleResponseSchemas.timeline)(
        JSON.parse(timelineJson),
      ).warriors,
    ).toHaveLength(2);
  });

  it("stores one canonical battle for duplicated incremental and compact payloads", async () => {
    const testApplication = createTestApplication();
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
    const testApplication = createTestApplication();
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
    const renewed = Promise.withResolvers<void>();
    const contended = Promise.withResolvers<void>();
    const redis = createRedisBoundary({
      now: () => currentTime,
      onRenew: () => {
        if (currentTime === 10) renewed.resolve();
      },
      onContention: contended.resolve,
    });
    let releaseTransaction!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });
    let markTransactionStarted!: () => void;
    const transactionStarted = new Promise<void>((resolve) => {
      markTransactionStarted = resolve;
    });
    const testApplication = createTestApplication({
      redis,
      lockTtlSeconds: 0.03,
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
    await renewed.promise;
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
    await contended.promise;
    const transactionCallsDuringContention =
      testApplication.database.getTransactionCount();

    releaseTransaction();
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
    const renewalFailed = Promise.withResolvers<void>();
    redis.eval.mockImplementation(() => {
      renewalFailed.resolve();
      return Promise.resolve(0);
    });
    const testApplication = createTestApplication({
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
    await renewalFailed.promise;
    const settledBeforeTransactionFinished = creationSettled;

    releaseTransaction();

    await expect(creationOutcome).resolves.toBe("rejected");
    expect(settledBeforeTransactionFinished).toBe(false);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
  });

  it("preserves separate battle events that do not have event ids", async () => {
    const testApplication = createTestApplication();
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
    const testApplication = createTestApplication();
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
    const testApplication = createTestApplication();
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
    const testApplication = createTestApplication({ redis });
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
    const testApplication = createTestApplication({
      redis,
      waitTimeoutMs: 30,
    });
    app = testApplication.app;

    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 503, {
      ...battleContext,
      submissionId: "lock-timeout",
      events: [battleEvent],
    });

    expect(await testApplication.database.getStoredBattles()).toHaveLength(0);
  });
});
