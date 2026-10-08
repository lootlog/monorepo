import {
  unusedBattles,
  unusedBattleAnalytics,
  unusedDeleteQueue,
  createBattleFixture,
} from "../../test/battle-fixtures.js";
import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { makeBattlelogOperations } from "./battlelog-operations.js";

describe("Battlelog operations", () => {
  it("forwards timeline requests with the authenticated user", async () => {
    const timeline = {
      battleId: "battle-1",
      generatedAt: new Date().toISOString(),
      timeline: [],
      warriors: [],
    };

    const getBattleTimeline = mock(() => Effect.succeed(timeline));

    const operations = makeBattlelogOperations(
      { ...unusedBattles, getBattleTimeline },
      unusedBattleAnalytics,
      unusedDeleteQueue,
    );

    await expect(
      Effect.runPromise(
        operations.battles.getBattleTimeline("battle-1", "user-1"),
      ),
    ).resolves.toBe(timeline);
    expect(getBattleTimeline).toHaveBeenCalledWith("battle-1", "user-1");
  });

  it("requires ownership of the battle a legacy link resolves to before updating its visibility", async () => {
    const assertBattleOwner = mock(() => Effect.void);

    const updateBattle = mock(() =>
      Effect.succeed({ ...createBattleFixture(), warriors: [] }),
    );

    const resolveBattleId = mock(() => Effect.succeed("battle-1"));

    const operations = makeBattlelogOperations(
      { ...unusedBattles, assertBattleOwner, resolveBattleId, updateBattle },
      unusedBattleAnalytics,
      unusedDeleteQueue,
    );

    await Effect.runPromise(
      operations.battles.updateBattle(
        "cmglj0y2u0224qd0ioniw0lxa",
        { public: true },
        "user-1",
      ),
    );

    expect(resolveBattleId).toHaveBeenCalledWith("cmglj0y2u0224qd0ioniw0lxa");
    expect(assertBattleOwner).toHaveBeenCalledWith("battle-1", "user-1");
    expect(updateBattle).toHaveBeenCalledWith("battle-1", { public: true });
  });

  it("awards ties to the lowest warrior ID regardless of row order", async () => {
    const getPublicBattle = mock(() =>
      Effect.succeed(
        createBattleFixture({
          warriors: [
            { originalId: "10", name: "Later", criticalHits: 2, turns: 3 },
            { originalId: "9", name: "Earlier", criticalHits: 2, turns: 3 },
          ],
        }),
      ),
    );

    const operations = makeBattlelogOperations(
      { ...unusedBattles, getPublicBattle },
      unusedBattleAnalytics,
      unusedDeleteQueue,
    );

    const battle = await Effect.runPromise(
      operations.publicBattles.getPublicBattle("battle-1"),
    );

    expect(battle.statistics.criticalMaster).toEqual({
      warriorId: "9",
      name: "Earlier",
      value: 2,
    });
    expect(battle.statistics.mostActive?.warriorId).toBe("9");
  });
});
