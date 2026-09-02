import { describe, expect, it, mock } from "bun:test";
import { BattlesController } from "./battles.controller.js";
import type { BattlesService } from "./battles.service.js";
import type { BattleAnalyticsService } from "./services/battle-analytics.service.js";

describe("BattlesController", () => {
  it("forwards timeline requests with the authenticated user", async () => {
    const timeline = {
      battleId: "battle-1",
      generatedAt: new Date().toISOString(),
      timeline: [],
      warriors: [],
    };
    const getBattleTimeline = mock(async () => timeline);
    const controller = new BattlesController(
      { getBattleTimeline } as unknown as BattlesService,
      {} as BattleAnalyticsService,
    );

    await expect(
      controller.getBattleTimeline("battle-1", "user-1"),
    ).resolves.toBe(timeline);
    expect(getBattleTimeline).toHaveBeenCalledWith("battle-1", "user-1");
  });

  it("requires ownership before updating battle visibility", async () => {
    const assertBattleOwner = mock(async () => undefined);
    const updateBattle = mock(async () => ({
      id: "battle-1",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      warriors: [],
      statistics: {},
    }));
    const controller = new BattlesController(
      { assertBattleOwner, updateBattle } as unknown as BattlesService,
      {} as BattleAnalyticsService,
    );

    await controller.updateBattle("battle-1", { public: true }, "user-1");

    expect(assertBattleOwner).toHaveBeenCalledWith("battle-1", "user-1");
    expect(updateBattle).toHaveBeenCalledWith("battle-1", { public: true });
  });
});
