import { Test, type TestingModule } from "@nestjs/testing";
import { BattlesService } from "./battles.service";
import { PrismaService } from "src/shared/modules/prisma/prisma.service";
import { R2Service } from "src/shared/modules/r2/r2.service";
import { PaginationService } from "./services/pagination.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { RedisService } from "src/shared/modules/redis/redis.service";

describe("BattlesService", () => {
  let service: BattlesService;

  beforeEach(async () => {
    const mockPrismaService = {
      battle: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userCharacter: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      battleWarrior: {
        findMany: jest.fn(),
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
          provide: PrismaService,
          useValue: mockPrismaService,
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
