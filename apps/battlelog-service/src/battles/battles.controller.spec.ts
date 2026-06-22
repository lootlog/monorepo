import { Test, type TestingModule } from "@nestjs/testing";
import { BattlesController } from "./battles.controller";
import { BattlesService } from "./battles.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { BattleAccessGuard } from "src/shared/guards/battle-access.guard";
import { BattleOwnerGuard } from "src/shared/guards/battle-owner.guard";
import type { QueryBattleStatisticsDto } from "./dto/query-battle-statistics.dto";

describe("BattlesController", () => {
  let controller: BattlesController;
  let mockBattlesService: Record<string, ReturnType<typeof vi.fn>>;
  let mockBattleAnalyticsService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    mockBattlesService = {
      createBattle: vi.fn(),
      getDashboardBattles: vi.fn(),
      getUserCharacters: vi.fn(),
      getUserWorlds: vi.fn(),
      getBattleFromDatabase: vi.fn(),
      getBattleRawData: vi.fn(),
      getBattleTimeline: vi.fn(),
      updateBattle: vi.fn(),
      deleteBattle: vi.fn(),
      getPublicBattles: vi.fn(),
      getPublicBattle: vi.fn(),
      getPublicBattleRaw: vi.fn(),
      getPublicBattleTimeline: vi.fn(),
      searchWarriors: vi.fn(),
    };

    mockBattleAnalyticsService = {
      getBattleAnalytics: vi.fn(),
      getCombatProfile: vi.fn(),
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

  it("should return computed timeline for accessible battle", async () => {
    const timeline = {
      battleId: "battle-1",
      generatedAt: new Date().toISOString(),
      timeline: [],
      warriors: [],
    };
    mockBattlesService.getBattleTimeline.mockResolvedValue(timeline);

    await expect(
      controller.getBattleTimeline("battle-1", "user-1"),
    ).resolves.toBe(timeline);
    expect(mockBattlesService.getBattleTimeline).toHaveBeenCalledWith(
      "battle-1",
      "user-1",
    );
  });

  it("should return combat profile statistics", async () => {
    const profile = {
      summary: {
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPH: 0,
        totalRatingDelta: 0,
        avgTurns: 0,
        avgDuration: 0,
        damagePerTurn: 0,
        mitigationRate: 0,
        controlRate: 0,
      },
      damageMix: [],
      mitigationMix: [],
      spellUsage: [],
      matchupByProfession: [],
      phTrend: [],
      ratingTrend: [],
      highlights: [],
    };
    mockBattleAnalyticsService.getCombatProfile.mockResolvedValue(profile);
    const query: QueryBattleStatisticsDto = { characterId: "char-1" };

    await expect(controller.getCombatProfile(query, "user-1")).resolves.toBe(
      profile,
    );
    expect(mockBattleAnalyticsService.getCombatProfile).toHaveBeenCalledWith(
      query,
      "user-1",
    );
  });
});
