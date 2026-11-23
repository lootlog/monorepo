import { describe, expect, it, spyOn } from "bun:test";
import { Effect, Schema } from "effect";
import { ContextLogger } from "@lootlog/instrumentation";
import {
  requestJson,
  postBattle,
  getBattle,
  warriors,
  moves,
  battleEvent,
  incrementalBattleEvents,
  battleContext,
  createRedisBoundary,
  createTestApplication,
  useBattleCreationDatabase,
  type TestApplication,
} from "./battle-creation.fixtures.js";

describe("battle creation deduplication", () => {
  let app: TestApplication;

  useBattleCreationDatabase(() => app);

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
    spyOn(ContextLogger.prototype, "error").mockImplementation(() => undefined);

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

    expect(cashtelan!.turns).toBe(12);
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

    expect(cashtelan!.turns).toBe(12);
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
    spyOn(ContextLogger.prototype, "error").mockImplementation(() => undefined);
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
    spyOn(ContextLogger.prototype, "error").mockImplementation(() => undefined);
    const redis = createRedisBoundary();
    redis.readCachedJson.mockResolvedValue(null);
    redis.acquireLock.mockResolvedValue(false);

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
