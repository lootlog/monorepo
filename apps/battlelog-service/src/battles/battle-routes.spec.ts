import { Hono } from "hono";
import { AppError } from "../lib/errors/http-errors.js";
import { createBattleRoutes } from "./battle-routes.js";

describe("battleRoutes", () => {
  const mockBattleStore = {
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

  const mockBattleAnalytics = {
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

  const mockDrizzleDatabase = {
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
    createBattleRoutes({
      battleStore: mockBattleStore as never,
      battleAnalytics: mockBattleAnalytics as never,
      drizzleDatabase: mockDrizzleDatabase as never,
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
    mockBattleStore.getPublicBattle.mockResolvedValue({
      id: "battle-1",
      public: true,
      warriors: [],
    });
  });

  it("exposes public battle routes without auth", async () => {
    const response = await app.request(
      "http://localhost/battles/public/battle-1",
    );

    expect(response.status).toBe(200);
    expect(mockBattleStore.getPublicBattle).toHaveBeenCalledWith("battle-1");
  });

  it("rejects authenticated routes without auth headers", async () => {
    const response = await app.request("http://localhost/battles/@me");

    expect(response.status).toBe(401);
  });
});
