import { BattleStore } from "./battle-store.js";
import { BattlePagination } from "./battle-pagination.js";
import { BattleAnalytics } from "./battle-analytics.js";

describe("BattleStore", () => {
  let service: BattleStore;

  beforeEach(async () => {
    const mockDrizzleDatabase = {
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

    const mockBattleArchive = {
      uploadBattleData: vi.fn(),
      getBattleData: vi.fn(),
      deleteBattleData: vi.fn(),
    };

    const mockBattlePagination = {
      paginateBattles: vi.fn(),
    };

    const mockBattleAnalytics = {
      getBattleAnalytics: vi.fn(),
      calculateProfessionWinRate: vi.fn(),
      getHeadToHead: vi.fn(),
      getCurrentStreak: vi.fn(),
      getBattleDurationStats: vi.fn(),
      getPhGrowthTimeSeries: vi.fn(),
    };

    service = new BattleStore(
      mockDrizzleDatabase as never,
      mockBattleArchive as never,
      mockBattlePagination as BattlePagination,
      mockBattleAnalytics as BattleAnalytics,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
