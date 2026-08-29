import { Test, type TestingModule } from "@nestjs/testing";
import { BattlesService } from "./battles.service.js";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
import { R2Service } from "#src/shared/modules/r2/r2.service";
import { PaginationService } from "./services/pagination.service.js";
import { BattleAnalyticsService } from "./services/battle-analytics.service.js";
import { BattleListFilterService } from "./services/battle-list-filter.service.js";
import { BattleMetadataService } from "./services/battle-metadata.service.js";
import { RedisService } from "@lootlog/nest-shared/redis";

describe("BattlesService", () => {
  let service: BattlesService;
  let mockDrizzleService: {
    db: {
      query: {
        battles: {
          findMany: ReturnType<typeof vi.fn>;
          findFirst: ReturnType<typeof vi.fn>;
        };
        battleWarriors: { findMany: ReturnType<typeof vi.fn> };
        userCharacters: {
          findMany: ReturnType<typeof vi.fn>;
          findFirst: ReturnType<typeof vi.fn>;
        };
      };
      insert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      selectDistinctOn: ReturnType<typeof vi.fn>;
      execute: ReturnType<typeof vi.fn>;
      transaction: ReturnType<typeof vi.fn>;
    };
  };
  let mockR2Service: {
    uploadBattleData: ReturnType<typeof vi.fn>;
    getBattleData: ReturnType<typeof vi.fn>;
    deleteBattleData: ReturnType<typeof vi.fn>;
  };
  let mockBattleAnalyticsService: {
    getBattleAnalytics: ReturnType<typeof vi.fn>;
    calculateProfessionWinRate: ReturnType<typeof vi.fn>;
    getHeadToHead: ReturnType<typeof vi.fn>;
    getCurrentStreak: ReturnType<typeof vi.fn>;
    getBattleDurationStats: ReturnType<typeof vi.fn>;
    getPhGrowthTimeSeries: ReturnType<typeof vi.fn>;
    invalidateAnalyticsCache: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockDrizzleService = {
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

    mockR2Service = {
      uploadBattleData: vi.fn(),
      getBattleData: vi.fn(),
      deleteBattleData: vi.fn(),
    };

    const mockPaginationService = {
      paginateBattles: vi.fn(),
    };

    mockBattleAnalyticsService = {
      getBattleAnalytics: vi.fn(),
      calculateProfessionWinRate: vi.fn(),
      getHeadToHead: vi.fn(),
      getCurrentStreak: vi.fn(),
      getBattleDurationStats: vi.fn(),
      getPhGrowthTimeSeries: vi.fn(),
      invalidateAnalyticsCache: vi.fn(),
    };

    const mockRedisService = {
      get: vi.fn(),
      getJson: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      setJson: vi.fn(),
      setNX: vi.fn().mockResolvedValue(true),
      del: vi.fn(),
      deleteByPattern: vi.fn(),
      eval: vi.fn(),
      getOrSetJsonBestEffort: vi.fn(
        ({ factory }: { factory: () => Promise<unknown> }) => factory(),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattlesService,
        BattleListFilterService,
        BattleMetadataService,
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

  it("repairs raw storage when a canonical battle already exists", async () => {
    vi.spyOn(service as never, "analyzeBattle").mockReturnValue({
      duration: 0,
      outcome: {
        hasFlee: false,
        loser: "Team 2",
        losingTeam: 2,
        winner: "Team 1",
        winningTeam: 1,
      },
      parsedMoves: [],
      statistics: {},
      type: "pvp",
      warriors: [],
    } as never);
    mockDrizzleService.db.query.battles.findFirst.mockResolvedValueOnce({
      id: "battle-existing",
    });

    await expect(
      service.createBattle({
        userId: "user-1",
        data: {
          accountId: "account-1",
          characterId: "character-1",
          submissionId: "submission-retry",
          world: "pandora",
          events: [
            {
              ev: 1,
              f: {
                m: ["move"],
                w: {
                  "1": {
                    icon: "a.gif",
                    lvl: 100,
                    name: "A",
                    originalId: 1,
                    prof: "w",
                    team: 1,
                  },
                  "2": {
                    icon: "b.gif",
                    lvl: 100,
                    name: "B",
                    originalId: 2,
                    prof: "m",
                    team: 2,
                  },
                },
              },
            },
          ],
        },
      }),
    ).resolves.toEqual({ battleId: "battle-existing" });

    expect(mockR2Service.uploadBattleData).toHaveBeenCalledWith(
      "battle-existing",
      expect.objectContaining({
        battleId: "battle-existing",
        rawData: expect.objectContaining({
          sourceEvents: expect.any(Array),
        }),
      }),
    );
  });

  it("returns an existing battle when a repeated submission hits the unique constraint", async () => {
    const analysis = {
      duration: 12,
      outcome: {
        hasFlee: false,
        loser: "Team 2",
        losingTeam: 2,
        winner: "Team 1",
        winningTeam: 1,
      },
      parsedMoves: [],
      statistics: {},
      type: "pvp",
      warriors: [],
    };
    const existingBattle = {
      id: "battle-existing",
      warriors: [],
    };

    vi.spyOn(service as never, "analyzeBattle").mockReturnValue(
      analysis as never,
    );
    mockDrizzleService.db.transaction.mockRejectedValueOnce(
      Object.assign(
        new Error("duplicate key value violates unique constraint"),
        {
          code: "23505",
        },
      ),
    );
    mockDrizzleService.db.query.battles.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingBattle);

    await expect(
      service.createBattle({
        userId: "user-1",
        data: {
          accountId: "account-1",
          characterId: "character-1",
          submissionId: "submission-1",
          world: "pandora",
          events: [
            {
              ev: 1,
              f: {
                m: ["move"],
                w: {
                  "1": {
                    icon: "a.gif",
                    lvl: 100,
                    name: "A",
                    originalId: 1,
                    prof: "w",
                    team: 1,
                  },
                  "2": {
                    icon: "b.gif",
                    lvl: 100,
                    name: "B",
                    originalId: 2,
                    prof: "m",
                    team: 2,
                  },
                },
              },
            },
          ],
        },
      }),
    ).resolves.toEqual({ battleId: "battle-existing" });

    expect(mockDrizzleService.db.query.battles.findFirst).toHaveBeenCalledWith({
      where: { submissionId: "submission-1" },
      with: { warriors: true },
    });
    expect(mockR2Service.uploadBattleData).toHaveBeenCalledWith(
      "battle-existing",
      expect.objectContaining({
        battleId: "battle-existing",
      }),
    );
    expect(
      mockBattleAnalyticsService.invalidateAnalyticsCache,
    ).toHaveBeenCalledWith("user-1");
  });
});
