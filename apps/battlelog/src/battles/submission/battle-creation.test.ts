import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Effect, Schema } from "effect";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import { setTimeout as sleep } from "node:timers/promises";
import { Logger } from "#src/infrastructure/logger";
import type { RedisStore } from "#src/infrastructure/redis-store";
import { makeBattlelogOperations } from "#src/battles/battlelog-operations";
import { makeBattles, type Battles } from "#src/battles/battles.service";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import type { BattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import type { BattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import type { BattlePagination } from "#src/battles/analytics/pagination.service";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors } from "#src/database/schema";
import type { BattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import { makeBattlelogTestBoundary } from "#src/http/battlelog-http";
import {
  effectDatabaseBoundary,
  runEffectService,
} from "../../../test/effect-service.js";

type TestApplication = ReturnType<typeof makeBattlelogTestBoundary> & {
  battles: ReturnType<typeof runEffectService<Battles>>;
};

const requestJson = async <S extends Schema.ConstraintDecoder<unknown>>(
  handler: TestApplication["handler"],
  method: "GET" | "POST",
  path: string,
  schema: S,
  expectedStatus: number,
  body?: unknown,
) => {
  const response = await handler(
    new Request(`http://battlelog.test${path}`, {
      method,
      headers: { "content-type": "application/json", ...authHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
  expect(response.status).toBe(expectedStatus);
  return { body: Schema.decodeUnknownSync(schema)(await response.json()) };
};
const postBattle = (handler: TestApplication["handler"], body: unknown) =>
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

type StoredBattle = Record<string, unknown> & {
  createdAt: Date;
  id: string;
  submissionId?: string;
  userId: string;
  warriors: StoredWarrior[];
};

type StoredWarrior = Record<string, unknown> & {
  battleId: string;
  id: string;
  name: string;
  turns: number;
};

const createDatabaseBoundary = ({
  beforeTransaction,
}: {
  beforeTransaction?: () => Promise<void>;
} = {}) => {
  const storedBattles: StoredBattle[] = [];

  const findBattle = ({
    where,
  }: {
    where?: Record<string, unknown>;
  }): StoredBattle | undefined => {
    if (!where) return undefined;
    if (typeof where.id === "string") {
      return storedBattles.find((battle) => battle.id === where.id);
    }
    if (typeof where.submissionId === "string") {
      return storedBattles.find(
        (battle) => battle.submissionId === where.submissionId,
      );
    }
    if (typeof where.semanticFingerprint === "string") {
      const cutoff =
        typeof where.createdAt === "object" &&
        where.createdAt &&
        "gte" in where.createdAt &&
        where.createdAt.gte instanceof Date
          ? where.createdAt.gte
          : new Date(0);
      return storedBattles.find(
        (battle) =>
          battle.semanticFingerprint === where.semanticFingerprint &&
          battle.userId === where.userId &&
          battle.createdAt >= cutoff,
      );
    }
    return undefined;
  };

  const createInsert = (table: unknown) => ({
    values: (input: Record<string, unknown> | Record<string, unknown>[]) => ({
      returning: async () => {
        if (table === battles) {
          const values = input as Record<string, unknown>;
          if (
            values.submissionId &&
            storedBattles.some(
              (battle) => battle.submissionId === values.submissionId,
            )
          ) {
            throw Object.assign(new Error("duplicate submission id"), {
              code: "23505",
            });
          }
          const battle: StoredBattle = {
            difficultyRank: null,
            honorPoints: 0,
            id: `battle-${storedBattles.length + 1}`,
            public: false,
            result: null,
            ratingDelta: null,
            opponentLvl: null,
            opponentOplvl: null,
            opponentRating: null,
            rating: null,
            status: null,
            pointsGained: null,
            placementCur: null,
            placementMax: null,
            dailyStageId: null,
            dailyPointsCur: null,
            dailyPointsMax: null,
            dailyPointsStep: null,
            dailyRewardsLast: null,
            dailyRewardsCur: null,
            dailyRewardsMax: null,
            createdAt: new Date(Date.now()),
            updatedAt: new Date(Date.now()),
            ...values,
            userId: String(values.userId),
            warriors: [],
          };
          storedBattles.push(battle);
          return [battle];
        }

        if (table === battleWarriors) {
          const values = input as Record<string, unknown>[];
          const insertedWarriors = values.map(
            (warrior, index): StoredWarrior => ({
              id: `warrior-${index + 1}`,
              ...warrior,
              battleId: String(warrior.battleId),
              name: String(warrior.name),
              turns: Number(warrior.turns),
            }),
          );
          const battle = storedBattles.find(
            (candidate) => candidate.id === insertedWarriors[0]?.battleId,
          );
          if (battle) battle.warriors = insertedWarriors;
          return insertedWarriors;
        }

        return [];
      },
    }),
  });

  const createUpdate = () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => ({
        returning: async () => {
          const duration = Number(values.duration);
          const battle = storedBattles.find(
            (candidate) => Number(candidate.duration) < duration,
          );
          if (!battle) return [];

          Object.assign(battle, values);
          return [{ id: battle.id }];
        },
      }),
    }),
  });

  return {
    service: {
      run: mock((query) =>
        Effect.isEffect(query)
          ? Effect.runPromise(query as Effect.Effect<unknown, unknown, never>)
          : Promise.resolve(query),
      ),
      db: {
        query: {
          battles: {
            findFirst: mock(async (query) => findBattle(query) ?? null),
          },
        },
        transaction: mock(async (factory) => {
          await beforeTransaction?.();
          const result = factory({ insert: createInsert });
          return Effect.isEffect(result)
            ? Effect.runPromise(
                result as Effect.Effect<unknown, unknown, never>,
              )
            : result;
        }),
        update: mock(createUpdate),
      },
    },
    storedBattles,
  };
};

const createRedisBoundary = ({
  now = Date.now,
}: {
  now?: () => number;
} = {}) => {
  const values = new Map<
    string,
    { expiresAt: number | null; value: unknown }
  >();
  const locks = new Map<string, { expiresAt: number | null; token: string }>();

  return {
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
    getJson: mock(async (key: string) => {
      const cached = values.get(key);
      if (!cached) return null;
      if (cached.expiresAt !== null && cached.expiresAt <= now()) {
        values.delete(key);
        return null;
      }
      return cached.value;
    }),
    getOrSetJsonBestEffort: mock(
      ({ factory }: { factory: () => Promise<unknown> }) => factory(),
    ),
    setJson: mock(async (key: string, value: unknown, ttlSeconds?: number) => {
      values.set(key, {
        expiresAt: ttlSeconds ? now() + ttlSeconds * 1_000 : null,
        value,
      });
    }),
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
  const database = createDatabaseBoundary({ beforeTransaction });
  const drizzle = effectDatabaseBoundary(
    database.service.db,
  ) as unknown as DrizzleDatabase;
  const redisService = redis as unknown as RedisStore;
  const analyticsService = {
    invalidateAnalyticsCache: mock(() => Effect.void),
  } as unknown as BattleAnalytics;
  const battlesModule = makeBattles(
    drizzle,
    {
      uploadBattleData: mock(),
      getBattleData: mock(),
    } as unknown as BattleObjectStorage,
    redisService,
    {} as BattlePagination,
    analyticsService,
    {} as BattleListFilter,
    {
      upsertUserCharacter: mock(() => Effect.void),
    } as unknown as BattleMetadata,
    {
      cacheTtlSeconds: 10,
      lockRefreshIntervalMs: 10,
      lockTtlSeconds: 0.03,
      waitIntervalMs: 1,
      waitTimeoutMs,
    },
  );
  const battlesService = runEffectService(battlesModule);
  const boundary = makeBattlelogTestBoundary(
    makeBattlelogOperations(battlesModule, analyticsService, {
      add: mock(),
    } as never),
  );
  const app: TestApplication = {
    ...boundary,
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
    expect(testApplication.database.storedBattles).toHaveLength(1);
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
    expect(testApplication.database.storedBattles).toHaveLength(1);
    expect(
      Number(testApplication.database.storedBattles[0]?.duration),
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
    const firstCreation = battlesService.createBattle({
      data: {
        ...battleContext,
        submissionId: "long-running-first",
        events: [battleEvent],
      },
      userId: "user-1",
    });

    await transactionStarted;
    currentTime = 10;
    while (redis.eval.mock.calls.length === 0) {
      await sleep(1);
    }
    currentTime = 31;

    const secondCreation = battlesService.createBattle({
      data: {
        ...battleContext,
        submissionId: "long-running-second",
        events: [battleEvent],
      },
      userId: "user-1",
    });
    await sleep(0);
    const transactionCallsDuringContention =
      testApplication.database.service.db.transaction.mock.calls.length;

    releaseTransaction();
    await sleep(1);
    const [firstResult, secondResult] = await Promise.all([
      firstCreation,
      secondCreation,
    ]);

    expect(secondResult).toEqual(firstResult);
    expect(transactionCallsDuringContention).toBe(1);
    expect(testApplication.database.storedBattles).toHaveLength(1);
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
    const creationOutcome = battlesService
      .createBattle({
        data: {
          ...battleContext,
          submissionId: "lost-lock",
          events: [battleEvent],
        },
        userId: "user-1",
      })
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
    expect(testApplication.database.storedBattles).toHaveLength(1);
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
    expect(testApplication.database.storedBattles).toHaveLength(2);
    dateNow.mockRestore();
  });

  it("returns 503 without storing a battle when Redis is unavailable", async () => {
    spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.getJson.mockRejectedValue(new Error("Redis unavailable"));
    const testApplication = await createTestApplication({ redis });
    app = testApplication.app;

    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 503, {
      ...battleContext,
      submissionId: "redis-failure",
      events: [battleEvent],
    });

    expect(testApplication.database.storedBattles).toHaveLength(0);
  });

  it("returns 503 without storing a battle when the deduplication lock times out", async () => {
    spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.getJson.mockResolvedValue(null);
    redis.setNX.mockResolvedValue(false);
    const testApplication = await createTestApplication({ redis });
    app = testApplication.app;

    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 503, {
      ...battleContext,
      submissionId: "lock-timeout",
      events: [battleEvent],
    });

    expect(testApplication.database.storedBattles).toHaveLength(0);
  });
});
