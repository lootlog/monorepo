import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import type { Queue } from "bullmq";
import { makeBattlelogOperations } from "./battlelog-operations.js";
import type { DeleteUserBattlesJobData } from "./delete-user-battles.processor.js";
import type { Battles } from "./battles.service.js";
import type { BattleAnalytics } from "./services/battle-analytics.service.js";

const queue = {} as Queue<DeleteUserBattlesJobData>;

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
      { getBattleTimeline } as unknown as Battles,
      {} as BattleAnalytics,
      queue,
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
      Effect.succeed({
        id: "battle-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        warriors: [],
        statistics: {},
      }),
    );
    const operations = makeBattlelogOperations(
      { assertBattleOwner, updateBattle } as unknown as Battles,
      {} as BattleAnalytics,
      queue,
    );

    await Effect.runPromise(
      operations.battles.updateBattle("battle-1", { public: true }, "user-1"),
    );

    expect(assertBattleOwner).toHaveBeenCalledWith("battle-1", "user-1");
    expect(updateBattle).toHaveBeenCalledWith("battle-1", { public: true });
  });
});
