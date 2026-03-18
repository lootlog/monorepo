import { Test, type TestingModule } from "@nestjs/testing";
import { BattlesService } from "./battles.service";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { R2Service } from "src/shared/modules/r2/r2.service";
import { PaginationService } from "./services/pagination.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { RedisService } from "@lootlog/nest-shared";

describe("BattlesService", () => {
  let service: BattlesService;

  beforeEach(async () => {
    const mockDrizzleService = {
      db: {
        query: {
          battles: { findMany: jest.fn(), findFirst: jest.fn() },
          battleWarriors: { findMany: jest.fn() },
          userCharacters: { findMany: jest.fn(), findFirst: jest.fn() },
        },
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockReturnValue({
              returning: jest.fn(),
            }),
            returning: jest.fn(),
          }),
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              returning: jest.fn(),
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn(),
          }),
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn(),
          }),
        }),
        selectDistinctOn: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn(),
            }),
          }),
        }),
        execute: jest.fn(),
        transaction: jest.fn(),
      },
    };

    const mockR2Service = {
      uploadBattleData: jest.fn(),
      getBattleData: jest.fn(),
      deleteBattleData: jest.fn(),
    };

    const mockPaginationService = {
      paginateBattles: jest.fn(),
    };

    const mockBattleAnalyticsService = {
      getBattleAnalytics: jest.fn(),
      calculateProfessionWinRate: jest.fn(),
      getHeadToHead: jest.fn(),
      getCurrentStreak: jest.fn(),
      getBattleDurationStats: jest.fn(),
      getPhGrowthTimeSeries: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      deleteByPattern: jest.fn(),
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
