import { Test, type TestingModule } from "@nestjs/testing";
import { BattlesController } from "./battles.controller";
import { BattlesService } from "./battles.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { BattleAccessGuard } from "src/shared/guards/battle-access.guard";
import { BattleOwnerGuard } from "src/shared/guards/battle-owner.guard";

describe("BattlesController", () => {
  let controller: BattlesController;

  beforeEach(async () => {
    const mockBattlesService = {
      createBattle: jest.fn(),
      getDashboardBattles: jest.fn(),
      getUserCharacters: jest.fn(),
      getUserWorlds: jest.fn(),
      getBattleFromDatabase: jest.fn(),
      getBattleRawData: jest.fn(),
      updateBattle: jest.fn(),
      deleteBattle: jest.fn(),
      getPublicBattles: jest.fn(),
      getPublicBattle: jest.fn(),
      getPublicBattleRaw: jest.fn(),
      searchWarriors: jest.fn(),
    };

    const mockBattleAnalyticsService = {
      getBattleAnalytics: jest.fn(),
      calculateProfessionWinRate: jest.fn(),
      getHeadToHead: jest.fn(),
      getCurrentStreak: jest.fn(),
      getBattleDurationStats: jest.fn(),
      getPhGrowthTimeSeries: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BattlesController],
      providers: [
        {
          provide: BattlesService,
          useValue: mockBattlesService,
        },
        {
          provide: BattleAnalyticsService,
          useValue: mockBattleAnalyticsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(BattleAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(BattleOwnerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BattlesController>(BattlesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
