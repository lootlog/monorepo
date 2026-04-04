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
      createBattle: vi.fn(),
      getDashboardBattles: vi.fn(),
      getUserCharacters: vi.fn(),
      getUserWorlds: vi.fn(),
      getBattleFromDatabase: vi.fn(),
      getBattleRawData: vi.fn(),
      updateBattle: vi.fn(),
      deleteBattle: vi.fn(),
      getPublicBattles: vi.fn(),
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
