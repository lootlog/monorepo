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

  it("requires ownership before updating battle visibility", async () => {
    const assertBattleOwner = mock(() => Effect.void);
    const updateBattle = mock(() =>
      Effect.succeed({ ...createBattleFixture(), warriors: [] }),
    );
    const operations = makeBattlelogOperations(
      { ...unusedBattles, assertBattleOwner, updateBattle },
      unusedBattleAnalytics,
      unusedDeleteQueue,
    );

    await Effect.runPromise(
      operations.battles.updateBattle("battle-1", { public: true }, "user-1"),
    );

    expect(assertBattleOwner).toHaveBeenCalledWith("battle-1", "user-1");
    expect(updateBattle).toHaveBeenCalledWith("battle-1", { public: true });
  });
});
