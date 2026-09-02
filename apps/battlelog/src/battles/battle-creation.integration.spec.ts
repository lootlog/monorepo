import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { Effect } from "effect";
import { setTimeout as sleep } from "node:timers/promises";
import { Logger } from "#src/platform/logger";
import type { RedisStore } from "#src/shared/modules/redis/redis.service";
import { makeBattlelogOperations } from "./battles.controller.js";
import { makeBattles, type Battles } from "./battles.service.js";
import type { BattleAnalytics } from "./services/battle-analytics.service.js";
import type { BattleListFilter } from "./services/battle-list-filter.service.js";
import type { BattleMetadata } from "./services/battle-metadata.service.js";
import type { BattlePagination } from "./services/pagination.service.js";
import type { DrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import { battles, battleWarriors } from "#src/shared/modules/drizzle/schema";
import type { BattleObjectStorage } from "#src/shared/modules/r2/r2.service";
import { makeBattlelogTestBoundary } from "../http/battlelog-http.js";
import { runEffectService } from "../../test/effect-service.js";

const vi = {
  fn: mock,
  spyOn,
};

type TestApplication = {
  close(): Promise<void>;
  get(_token: typeof makeBattles): ReturnType<typeof runEffectService<Battles>>;
  getHttpServer(): (request: Request) => Promise<Response>;
};

const request = (handler: (request: Request) => Promise<Response>) => {
  const makeRequest = (method: "GET" | "POST", path: string) => {
    let body: unknown;
    let headers: Record<string, string> = {};
    const execute = async (expectedStatus: number) => {
      const response = await handler(
        new Request(`http://battlelog.test${path}`, {
          method,
          headers: { "content-type": "application/json", ...headers },
          ...(method === "POST" && body !== undefined
            ? { body: JSON.stringify(body) }
            : {}),
        }),
      );
      expect(response.status).toBe(expectedStatus);
      return { body: (await response.json()) as any };
    };
    const chain = {
      set(nextHeaders: Record<string, string>) {
        headers = nextHeaders;
        return chain;
      },
      send(nextBody: unknown) {
        body = nextBody;
        return chain;
      },
      expect: execute,
    };
    return chain;
  };

  return {
    get: (path: string) => makeRequest("GET", path),
    post: (path: string) => makeRequest("POST", path),
  };
};

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
      run: vi.fn((query) =>
        Effect.isEffect(query)
          ? Effect.runPromise(query as Effect.Effect<unknown, unknown, never>)
          : Promise.resolve(query),
      ),
      db: {
        query: {
          battles: {
            findFirst: vi.fn(async (query) => findBattle(query) ?? null),
          },
        },
        transaction: vi.fn(async (factory) => {
          await beforeTransaction?.();
          const result = factory({ insert: createInsert });
          return Effect.isEffect(result)
            ? Effect.runPromise(
                result as Effect.Effect<unknown, unknown, never>,
              )
            : result;
        }),
        update: vi.fn(createUpdate),
      },
    },
    storedBattles,
  };
};

const createRedisBoundary = () => {
  const values = new Map<
    string,
    { expiresAt: number | null; value: unknown }
  >();
  const locks = new Map<string, { expiresAt: number | null; token: string }>();

  return {
    del: vi.fn(async (key: string) => (values.delete(key) ? 1 : 0)),
    deleteByPattern: vi.fn(),
    eval: vi.fn(
      async (_script: string, keys: string[], args: Array<string | number>) => {
        const [key] = keys;
        const [token, ttlSeconds] = args;
        const lock = key ? locks.get(key) : undefined;
        if (
          key &&
          lock &&
          lock.token === token &&
          (lock.expiresAt === null || lock.expiresAt > Date.now())
        ) {
          if (ttlSeconds !== undefined) {
            lock.expiresAt = Date.now() + Number(ttlSeconds) * 1_000;
            return 1;
          }
          locks.delete(key);
          return 1;
        }
        return 0;
      },
    ),
    getJson: vi.fn(async (key: string) => {
      const cached = values.get(key);
      if (!cached) return null;
      if (cached.expiresAt !== null && cached.expiresAt <= Date.now()) {
        values.delete(key);
        return null;
      }
      return cached.value;
    }),
    getOrSetJsonBestEffort: vi.fn(
      ({ factory }: { factory: () => Promise<unknown> }) => factory(),
    ),
    setJson: vi.fn(async (key: string, value: unknown, ttlSeconds?: number) => {
      values.set(key, {
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1_000 : null,
        value,
      });
    }),
    setNX: vi.fn(async (key: string, token: string, ttlSeconds?: number) => {
      const existingLock = locks.get(key);
      if (
        existingLock &&
        (existingLock.expiresAt === null || existingLock.expiresAt > Date.now())
      ) {
        return false;
      }
      locks.set(key, {
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1_000 : null,
        token,
      });
      return true;
    }),
  };
};

const createTestApplication = async ({
  beforeTransaction,
  redis = createRedisBoundary(),
}: {
  beforeTransaction?: () => Promise<void>;
  redis?: ReturnType<typeof createRedisBoundary>;
} = {}) => {
  const database = createDatabaseBoundary({ beforeTransaction });
  const drizzle = database.service as unknown as DrizzleDatabase;
  const redisService = redis as unknown as RedisStore;
  const analyticsService = {
    invalidateAnalyticsCache: vi.fn(() => Effect.void),
  } as unknown as BattleAnalytics;
  const battlesModule = makeBattles(
    drizzle,
    {
      uploadBattleData: vi.fn(),
      getBattleData: vi.fn(),
    } as unknown as BattleObjectStorage,
    redisService,
    {} as BattlePagination,
    analyticsService,
    {} as BattleListFilter,
    {
      upsertUserCharacter: vi.fn(() => Effect.void),
    } as unknown as BattleMetadata,
    {
      cacheTtlSeconds: 10,
      lockRefreshIntervalMs: 10,
      lockTtlSeconds: 0.03,
      waitIntervalMs: 1,
      waitTimeoutMs: 30,
    },
  );
  const battlesService = runEffectService(battlesModule);
  const boundary = makeBattlelogTestBoundary(
    makeBattlelogOperations(battlesModule, analyticsService, {
      add: vi.fn(),
    } as never),
  );
  const app: TestApplication = {
    close: boundary.dispose,
    get: () => battlesService,
    getHttpServer: () => boundary.handler,
  };
  return { app, database };
};

describe("battle creation API deduplication", () => {
  let app: TestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it("stores one canonical battle for duplicated incremental and compact payloads", async () => {
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const [firstResponse, secondResponse] = await Promise.all([
      request(app.getHttpServer())
        .post("/battles")
        .set(authHeaders)
        .send({
          ...battleContext,
          submissionId: "incremental-submission",
          events: [battleEvent, battleEvent],
        })
        .expect(201),
      request(app.getHttpServer())
        .post("/battles")
        .set(authHeaders)
        .send({
          ...battleContext,
          submissionId: "compact-submission",
          events: [{ ...battleEvent, ev: 1_785_091_976.9 }],
        })
        .expect(201),
    ]);

    expect(secondResponse.body).toEqual(firstResponse.body);

    const battleResponse = await request(app.getHttpServer())
      .get(`/battles/${firstResponse.body.battleId}`)
      .set(authHeaders)
      .expect(200);
    const cashtelan = battleResponse.body.warriors.find(
      (warrior: { name: string }) => warrior.name === "cashtelan",
    );

    expect(cashtelan.turns).toBe(12);
    expect(testApplication.database.storedBattles).toHaveLength(1);
  });

  it("preserves the incremental duration when a compact replay arrives first", async () => {
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const compactResponse = await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
        ...battleContext,
        submissionId: "compact-duration-submission",
        events: [battleEvent],
      })
      .expect(201);
    const incrementalResponse = await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
        ...battleContext,
        submissionId: "incremental-duration-submission",
        events: incrementalBattleEvents,
      })
      .expect(201);

    expect(incrementalResponse.body).toEqual(compactResponse.body);
    expect(testApplication.database.storedBattles).toHaveLength(1);
    expect(
      Number(testApplication.database.storedBattles[0]?.duration),
    ).toBeCloseTo(0.3, 5);
  });

  it("keeps equivalent creation single-flight after the initial lock TTL", async () => {
    let releaseTransaction!: () => void;
    const transactionGate = new Promise<void>((resolve) => {
      releaseTransaction = resolve;
    });
    let markTransactionStarted!: () => void;
    const transactionStarted = new Promise<void>((resolve) => {
      markTransactionStarted = resolve;
    });
    const testApplication = await createTestApplication({
      beforeTransaction: async () => {
        markTransactionStarted();
        await transactionGate;
      },
    });
    app = testApplication.app;
    const battlesService = app.get(makeBattles);
    const firstCreation = battlesService.createBattle({
      data: {
        ...battleContext,
        submissionId: "long-running-first",
        events: [battleEvent],
      },
      userId: "user-1",
    });

    await transactionStarted;
    await sleep(31);

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
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

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
    const battlesService = app.get(makeBattles);
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

    const response = await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
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
      })
      .expect(201);

    const battleResponse = await request(app.getHttpServer())
      .get(`/battles/${response.body.battleId}`)
      .set(authHeaders)
      .expect(200);
    const cashtelan = battleResponse.body.warriors.find(
      (warrior: { name: string }) => warrior.name === "cashtelan",
    );

    expect(cashtelan.turns).toBe(12);
  });

  it("preserves distinct battle events that share an event id", async () => {
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const response = await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
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
      })
      .expect(201);

    const battleResponse = await request(app.getHttpServer())
      .get(`/battles/${response.body.battleId}`)
      .set(authHeaders)
      .expect(200);
    const cashtelan = battleResponse.body.warriors.find(
      (warrior: { name: string }) => warrior.name === "cashtelan",
    );

    expect(cashtelan.turns).toBe(12);
  });

  it("allows an identical battle after the deduplication window", async () => {
    const dateNow = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse("2026-07-26T18:52:57.000Z"));
    const testApplication = await createTestApplication();
    app = testApplication.app;

    const firstResponse = await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
        ...battleContext,
        submissionId: "first-real-battle",
        events: [battleEvent],
      })
      .expect(201);
    dateNow.mockReturnValue(Date.parse("2026-07-26T18:53:07.001Z"));
    const secondResponse = await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
        ...battleContext,
        submissionId: "second-real-battle",
        events: [{ ...battleEvent, ev: 1_785_091_986.7 }],
      })
      .expect(201);

    expect(secondResponse.body.battleId).not.toBe(firstResponse.body.battleId);
    expect(testApplication.database.storedBattles).toHaveLength(2);
    dateNow.mockRestore();
  });

  it("returns 503 without storing a battle when Redis is unavailable", async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.getJson.mockRejectedValue(new Error("Redis unavailable"));
    const testApplication = await createTestApplication({ redis });
    app = testApplication.app;

    await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
        ...battleContext,
        submissionId: "redis-failure",
        events: [battleEvent],
      })
      .expect(503);

    expect(testApplication.database.storedBattles).toHaveLength(0);
  });

  it("returns 503 without storing a battle when the deduplication lock times out", async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.getJson.mockResolvedValue(null);
    redis.setNX.mockResolvedValue(false);
    const testApplication = await createTestApplication({ redis });
    app = testApplication.app;

    await request(app.getHttpServer())
      .post("/battles")
      .set(authHeaders)
      .send({
        ...battleContext,
        submissionId: "lock-timeout",
        events: [battleEvent],
      })
      .expect(503);

    expect(testApplication.database.storedBattles).toHaveLength(0);
  });
});
