import { BattlesService } from "./battles.service.js";
import { PaginationService } from "./services/pagination.service.js";
import { BattleAnalyticsService } from "./services/battle-analytics.service.js";

describe("BattlesService", () => {
  let service: BattlesService;

  beforeEach(async () => {
    const mockDrizzleService = {
      db: {
        query: {
          battles: { findMany: vi.fn(), findFirst: vi.fn() },
          battleWarriors: { findMany: vi.fn() },
          userCharacters: { findMany: vi.fn(), findFirst: vi.fn() },
        },
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn(),
            }),
            returning: vi.fn(),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn(),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn(),
          }),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
        selectDistinctOn: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn(),
            }),
          }),
        }),
        execute: vi.fn(),
        transaction: vi.fn(),
      },
    };

    const mockR2Service = {
      uploadBattleData: vi.fn(),
      getBattleData: vi.fn(),
      deleteBattleData: vi.fn(),
    };

    const mockPaginationService = {
      paginateBattles: vi.fn(),
    };

    const mockBattleAnalyticsService = {
      getBattleAnalytics: vi.fn(),
      calculateProfessionWinRate: vi.fn(),
      getHeadToHead: vi.fn(),
      getCurrentStreak: vi.fn(),
      getBattleDurationStats: vi.fn(),
      getPhGrowthTimeSeries: vi.fn(),
    };

    service = new BattlesService(
      mockDrizzleService as never,
      mockR2Service as never,
      mockPaginationService as PaginationService,
      mockBattleAnalyticsService as BattleAnalyticsService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
