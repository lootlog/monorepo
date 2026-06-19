import { Test, type TestingModule } from "@nestjs/testing";
import { BattlesService } from "./battles.service";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { R2Service } from "src/shared/modules/r2/r2.service";
import { PaginationService } from "./services/pagination.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { RedisService } from "@lootlog/nest-shared/redis";

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

    const mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      deleteByPattern: vi.fn(),
      getOrSetJsonBestEffort: vi.fn(
        ({ factory }: { factory: () => Promise<unknown> }) => factory(),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlesService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: R2Service,
          useValue: mockR2Service,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: BattleAnalyticsService,
          useValue: mockBattleAnalyticsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BattlesService>(BattlesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
