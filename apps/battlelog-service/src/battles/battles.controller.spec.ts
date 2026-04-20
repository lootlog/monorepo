import { Hono } from "hono";
import { createBattlesController } from "./battles.controller.js";
import { AppError } from "../lib/errors/http-errors.js";

describe("BattlesController", () => {
  const mockBattlesService = {
    createBattle: vi.fn(),
    getDashboardBattles: vi.fn(),
    getUserCharacters: vi.fn(),
    getUserWorlds: vi.fn(),
    getBattleFromDatabase: vi.fn(),
    getBattleRawData: vi.fn(),
    updateBattle: vi.fn(),
    deleteBattle: vi.fn(),
    getPublicBattle: vi.fn(),
    getPublicBattleRaw: vi.fn(),
    searchWarriors: vi.fn(),
  };

  const mockBattleAnalyticsService = {
    getBattleAnalytics: vi.fn(),
    calculateProfessionWinRate: vi.fn(),
    getHeadToHead: vi.fn(),
    getCurrentStreak: vi.fn(),
    getBattleDurationStats: vi.fn(),
    getPhGrowthTimeSeries: vi.fn(),
    getRatingGrowthTimeSeries: vi.fn(),
    getRatingDeltaByOpponent: vi.fn(),
    getPlayerVsPlayerBattles: vi.fn(),
  };

  const mockDrizzleService = {
    db: {
      query: {
        battles: {
          findFirst: vi.fn(),
        },
      },
    },
  };

  const app = new Hono().route(
    "/battles",
    createBattlesController({
      battlesService: mockBattlesService as never,
      battleAnalyticsService: mockBattleAnalyticsService as never,
      drizzleService: mockDrizzleService as never,
    }),
  );

  app.onError((error, c) => {
    if (error instanceof AppError) {
      return c.json(
        { message: error.message },
        error.status as 400 | 401 | 403 | 404 | 500,
      );
    }

    return c.json({ message: "Internal Server Error" }, 500);
  });

  beforeEach(() => {
    mockBattlesService.getPublicBattle.mockResolvedValue({
      id: "battle-1",
      public: true,
      warriors: [],
    });
  });

  it("should expose public battle routes without auth", async () => {
    const response = await app.request(
      "http://localhost/battles/public/battle-1",
    );

    expect(response.status).toBe(200);
    expect(mockBattlesService.getPublicBattle).toHaveBeenCalledWith("battle-1");
  });

  it("should reject authenticated routes without auth headers", async () => {
    const response = await app.request("http://localhost/battles/@me");

    expect(response.status).toBe(401);
  });
});
