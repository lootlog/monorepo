import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import { describe, expect, it, spyOn } from "bun:test";
import { Effect, Schema } from "effect";
import { battles } from "#src/database/schema";
import {
  requestJson,
  postBattle,
  battleEvent,
  battleContext,
  authHeaders,
  ageStoredBattles,
  storedTimelines,
  storedBattleIds,
  createRedisBoundary,
  createTestApplication,
  databaseRuntime,
  sharedDatabase,
  useBattleCreationDatabase,
  type TestApplication,
} from "./battle-creation.fixtures.js";

describe("battle creation submissions", () => {
  let app: TestApplication;

  useBattleCreationDatabase(() => app);

  it("scopes submission IDs to their authenticated owner", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;

    const data = {
      ...battleContext,
      submissionId: "shared-submission",
      events: [battleEvent],
    };

    const first = await postBattle(app.handler, data);
    const original = (await storedTimelines()).get(first.body.battleId);
    const second = await postBattle(app.handler, data, "user-2");

    expect(second.body.battleId).not.toBe(first.body.battleId);
    expect((await storedTimelines()).get(first.body.battleId)).toEqual(
      original,
    );
    const stored = await testApplication.database.getStoredBattles();
    expect(stored.map((battle) => battle.userId).sort()).toEqual([
      "user-1",
      "user-2",
    ]);
  });

  it("keeps analytics cached when reading an accepted battle and its timeline", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;

    const { body } = await postBattle(app.handler, {
      ...battleContext,
      submissionId: "analytics-read-cache",
      events: [battleEvent],
    });

    expect(
      testApplication.analyticsService.invalidateAnalyticsCache,
    ).toHaveBeenCalledTimes(1);

    const detail = await Effect.runPromise(
      app.battles.getBattleFromDatabase(body.battleId, "user-1"),
    );

    const timeline = await Effect.runPromise(
      app.battles.getBattleTimeline(body.battleId, "user-1"),
    );

    expect(detail.id).toBe(body.battleId);
    expect(timeline.timeline.length).toBeGreaterThan(0);
    expect(
      testApplication.analyticsService.invalidateAnalyticsCache,
    ).toHaveBeenCalledTimes(1);
  });

  it("rejects changed payloads for an accepted submission without changing its data", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;

    const data = {
      ...battleContext,
      submissionId: "immutable-submission",
      events: [battleEvent],
    };

    await postBattle(app.handler, data);
    const timelines = await storedTimelines();
    const stored = await testApplication.database.getStoredBattles();
    await requestJson(app.handler, "POST", "/battles", Schema.Unknown, 400, {
      ...data,
      world: "another-world",
    });

    expect(await testApplication.database.getStoredBattles()).toEqual(stored);
    expect(await storedTimelines()).toEqual(timelines);
  });

  it("resolves the owner's durable submission after the semantic cache expires", async () => {
    const processBattle = spyOn(BattleProcessor.prototype, "processBattle");
    const redis = createRedisBoundary();
    const testApplication = createTestApplication({ redis });
    app = testApplication.app;

    const data = {
      ...battleContext,
      submissionId: "durable-retry",
      events: [battleEvent],
    };

    await postBattle(app.handler, data);
    redis.readCachedJson.mockResolvedValue(null);
    await ageStoredBattles();
    const [stored] = await storedBattleIds();
    const retry = await postBattle(app.handler, data);

    expect(retry.body).toEqual({ battleId: stored! });
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
    expect(testApplication.database.getTransactionCount()).toBe(1);
    expect(processBattle).toHaveBeenCalledTimes(1);
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
    await ageStoredBattles();
    const [older] = await storedBattleIds();

    const newer = await postBattle(app.handler, {
      ...data,
      submissionId: "newer-submission",
    });

    expect(newer.body.battleId).not.toBe(first.body.battleId);

    const retry = await postBattle(app.handler, data);
    expect(retry.body).toEqual({ battleId: older! });
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
      expect([...(await storedTimelines()).keys()]).toEqual([
        first.body.battleId,
      ]);
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
    const stored = await testApplication.database.getStoredBattles();
    const timelines = await storedTimelines();

    expect(stored).toHaveLength(1);
    expect([...timelines.keys()]).toEqual([stored[0]!.id]);
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
    const stored = await testApplication.database.getStoredBattles();
    const timelines = await storedTimelines();
    const retry = await postBattle(app.handler, { ...data, world: "changed" });

    expect(retry.body).toEqual(first.body);
    expect(await testApplication.database.getStoredBattles()).toEqual(stored);
    expect(await storedTimelines()).toEqual(timelines);
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
    await ageStoredBattles();
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
      (await testApplication.database.getStoredBattles()).map(
        (battle) => battle.userId,
      ),
    ).toEqual(["user-1"]);
  });
});
