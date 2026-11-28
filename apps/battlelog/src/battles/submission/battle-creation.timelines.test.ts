import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import { describe, expect, it, spyOn } from "bun:test";
import { sql } from "drizzle-orm";
import { Schema } from "effect";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import {
  battleLegacyIds,
  battles,
  battleSubmissions,
  battleTimelines,
} from "#src/database/schema";
import {
  requestJson,
  postBattle,
  getBattle,
  moves,
  battleEvent,
  battleContext,
  storedTimelines,
  createRedisBoundary,
  createTestApplication,
  databaseRuntime,
  sharedDatabase,
  useBattleCreationDatabase,
  type TestApplication,
} from "./battle-creation.fixtures.js";

describe("battle creation storage and timelines", () => {
  let app: TestApplication;

  useBattleCreationDatabase(() => app);

  it("stores the battle, its participants and timeline together, so a failed timeline write leaves nothing to retry around", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;

    const data = {
      ...battleContext,
      submissionId: "atomic-retry",
      events: [battleEvent],
    };

    for (const statement of [
      sql`CREATE FUNCTION reject_test_timeline() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Timeline storage unavailable'; END; $$`,
      sql`CREATE TRIGGER reject_test_timeline BEFORE INSERT ON battle_timelines FOR EACH ROW EXECUTE FUNCTION reject_test_timeline()`,
    ])
      await databaseRuntime.runPromise(sharedDatabase.execute(statement));

    try {
      await requestJson(
        app.handler,
        "POST",
        "/battles",
        Schema.Unknown,
        500,
        data,
      );
      expect(await testApplication.database.getStoredBattles()).toEqual([]);
      expect(
        await databaseRuntime.runPromise(
          sharedDatabase.select().from(battleSubmissions),
        ),
      ).toEqual([]);
    } finally {
      for (const statement of [
        sql`DROP TRIGGER reject_test_timeline ON battle_timelines`,
        sql`DROP FUNCTION reject_test_timeline()`,
      ])
        await databaseRuntime.runPromise(sharedDatabase.execute(statement));
    }

    const retry = await postBattle(app.handler, data);

    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
    expect((await storedTimelines()).get(retry.body.battleId)).toEqual(
      data.events,
    );
  });

  it("resolves a legacy battle link and reports its missing timeline as unavailable", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;

    const { body } = await postBattle(app.handler, {
      ...battleContext,
      events: [battleEvent],
    });

    await databaseRuntime.runPromise(sharedDatabase.delete(battleTimelines));
    await databaseRuntime.runPromise(
      sharedDatabase.insert(battleLegacyIds).values({
        legacyId: "cmglj0y2u0224qd0ioniw0lxa",
        battleId: body.battleId,
      }),
    );

    const battle = await requestJson(
      app.handler,
      "GET",
      "/battles/cmglj0y2u0224qd0ioniw0lxa",
      BattleResponseSchemas.battle,
      200,
    );

    expect(battle.body.id).toBe(body.battleId);

    for (const view of ["timeline", "raw"])
      await requestJson(
        app.handler,
        "GET",
        `/battles/cmglj0y2u0224qd0ioniw0lxa/${view}`,
        Schema.Unknown,
        404,
      );
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
      sharedDatabase
        .update(battles)
        .set({ public: true, updatedAt: new Date(0) }),
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

    const battle = Schema.decodeUnknownSync(BattleResponseSchemas.publicBattle)(
      JSON.parse(serialized),
    );

    expect(battle.id).toBe(body.battleId);
    expect(JSON.parse(serialized)).not.toHaveProperty("userId");
    expect(battle.warriors).toHaveLength(2);

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

  it("returns the battleground the game sent with the battle in its raw data", async () => {
    app = createTestApplication().app;

    const { body } = await postBattle(app.handler, {
      ...battleContext,
      events: [
        { ...battleEvent, f: { ...battleEvent.f, battleground: "034.jpg" } },
      ],
    });

    const raw = await requestJson(
      app.handler,
      "GET",
      `/battles/${body.battleId}/raw`,
      BattleResponseSchemas.raw,
      200,
    );

    expect(raw.body.rawData.battleground).toBe("034.jpg");
  });

  it("stores one canonical battle for duplicated incremental and compact payloads", async () => {
    const processBattle = spyOn(BattleProcessor.prototype, "processBattle");
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

    expect(cashtelan!.turns).toBe(12);
    expect(await testApplication.database.getStoredBattles()).toHaveLength(1);
    expect(processBattle).toHaveBeenCalledTimes(1);
  });

  it("reuses computed timelines while checking current visibility and deletion on every read", async () => {
    const testApplication = createTestApplication();
    app = testApplication.app;

    const created = await postBattle(app.handler, {
      ...battleContext,
      events: [battleEvent],
    });

    const battleId = created.body.battleId;
    const path = `/battles/${battleId}/timeline`;
    const publicPath = `/battles/public/${battleId}/timeline`;
    await databaseRuntime.runPromise(
      sharedDatabase
        .update(battles)
        .set({ public: true, updatedAt: new Date(0) }),
    );
    const processBattle = spyOn(BattleProcessor.prototype, "processBattle");

    const invalidations =
      testApplication.analyticsService.invalidateAnalyticsCache.mock.calls
        .length;

    const first = await requestJson(
      app.handler,
      "GET",
      path,
      BattleResponseSchemas.timeline,
      200,
    );

    const second = await requestJson(
      app.handler,
      "GET",
      publicPath,
      BattleResponseSchemas.timeline,
      200,
    );

    expect(second.body).toEqual(first.body);
    expect(first.body.timeline).toHaveLength(moves.length);
    expect(processBattle).toHaveBeenCalledTimes(1);
    expect(
      testApplication.analyticsService.invalidateAnalyticsCache,
    ).toHaveBeenCalledTimes(invalidations);

    await databaseRuntime.runPromise(
      sharedDatabase
        .update(battles)
        .set({ public: false, updatedAt: new Date(0) }),
    );
    await requestJson(app.handler, "GET", publicPath, Schema.Unknown, 404);
    await requestJson(
      app.handler,
      "GET",
      path,
      Schema.Unknown,
      403,
      undefined,
      "user-2",
    );

    const owner = await requestJson(
      app.handler,
      "GET",
      path,
      BattleResponseSchemas.timeline,
      200,
    );

    expect(owner.body).toEqual(first.body);
    expect(processBattle).toHaveBeenCalledTimes(1);

    await databaseRuntime.runPromise(sharedDatabase.delete(battles));
    await requestJson(app.handler, "GET", path, Schema.Unknown, 404);
    await requestJson(app.handler, "GET", publicPath, Schema.Unknown, 404);
    expect(processBattle).toHaveBeenCalledTimes(1);
  });

  it("serves oversized timelines without admitting them to Redis", async () => {
    const processBattle = spyOn(BattleProcessor.prototype, "processBattle");
    const testApplication = createTestApplication();
    app = testApplication.app;

    const longMoves = Array.from(
      { length: 700 },
      () => "220=100;7533=90;+dmg=100;-dmg=100",
    );

    const created = await postBattle(app.handler, {
      ...battleContext,
      events: [{ ...battleEvent, f: { ...battleEvent.f, m: longMoves } }],
    });

    const path = `/battles/${created.body.battleId}/timeline`;

    const first = await requestJson(
      app.handler,
      "GET",
      path,
      BattleResponseSchemas.timeline,
      200,
    );

    const second = await requestJson(
      app.handler,
      "GET",
      path,
      BattleResponseSchemas.timeline,
      200,
    );

    expect(Buffer.byteLength(JSON.stringify(first.body))).toBeGreaterThan(
      1024 * 1024,
    );
    expect(second.body.timeline).toEqual(first.body.timeline);
    expect(second.body.timeline).toHaveLength(longMoves.length);
    expect(processBattle).toHaveBeenCalledTimes(3);
  });

  it("serves uncached timelines when Redis is unavailable", async () => {
    const redis = createRedisBoundary();
    const testApplication = createTestApplication({ redis });
    app = testApplication.app;

    const created = await postBattle(app.handler, {
      ...battleContext,
      events: [battleEvent],
    });

    redis.readCachedJson.mockRejectedValue(new Error("Redis unavailable"));

    const result = await requestJson(
      app.handler,
      "GET",
      `/battles/${created.body.battleId}/timeline`,
      BattleResponseSchemas.timeline,
      200,
    );

    expect(result.body.timeline).toHaveLength(moves.length);
  });
});
