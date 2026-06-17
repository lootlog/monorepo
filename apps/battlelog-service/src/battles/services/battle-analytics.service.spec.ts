import type { Mocked } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { BattleAnalyticsService } from "./battle-analytics.service";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { RedisService } from "@lootlog/nest-shared/redis";

describe("BattleAnalyticsService", () => {
  let service: BattleAnalyticsService;
  let drizzleService: { db: any };
  let redisService: Mocked<RedisService>;

  const mockUserId = "user-123";
  const mockCharacterId = "char-123";
  const mockWorld = "world1";

  const mockUserCharacter = {
    id: "uc-1",
    userId: mockUserId,
    characterId: mockCharacterId,
    world: mockWorld,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarrior1 = {
    id: "w-1",
    battleId: "b-1",
    originalId: mockCharacterId,
    name: "TestPlayer",
    icon: "icon1",
    prof: "warrior",
    lvl: 100,
    team: 1,
    ph: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWarrior2 = {
    id: "w-2",
    battleId: "b-1",
    originalId: "opponent-1",
    name: "Opponent1",
    icon: "icon2",
    prof: "mage",
    lvl: 95,
    team: 2,
    ph: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBattle = {
    id: "b-1",
    userId: mockUserId,
    accountId: "acc-1",
    characterId: mockCharacterId,
    world: mockWorld,
    type: "1v1",
    winner: "TestPlayer",
    loser: "Opponent1",
    winningTeam: 1,
    losingTeam: 2,
    hasFlee: false,
    duration: 1000,
    matchmaking: true,
    rating: 1500,
    opponentRating: 1450,
    ratingDelta: 25,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
    warriors: [mockWarrior1, mockWarrior2],
  };

  beforeEach(async () => {
    const mockDrizzleService = {
      db: {
        query: {
          userCharacters: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
          },
          battles: {
            findMany: vi.fn(),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
      },
    };

    const mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      getClient: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattleAnalyticsService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BattleAnalyticsService>(BattleAnalyticsService);
    drizzleService = module.get(DrizzleService);
    redisService = module.get(RedisService) as Mocked<RedisService>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getBattleAnalytics", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify({
        totalBattles: 10,
        wins: 6,
        losses: 4,
        winRatio: 60,
        totalPH: 100,
      });
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getBattleAnalytics(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
      expect(drizzleService.db.query.battles.findMany).not.toHaveBeenCalled();
    });

    it("should keep defined numeric filter values in cache keys", async () => {
      const cachedData = JSON.stringify({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      });
      redisService.get.mockResolvedValue(cachedData);

      await service.getBattleAnalytics(
        { characterId: mockCharacterId, minLevel: 0, maxLevel: 0 },
        mockUserId,
      );

      expect(redisService.get).toHaveBeenCalledWith(
        `analytics:${mockUserId}:${mockCharacterId}:all:all:0-0:all:all`,
      );
    });

    it("should calculate analytics from database when no cache", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleAnalytics(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.totalBattles).toBe(1);
      expect(result.wins).toBe(1);
      expect(result.losses).toBe(0);
      expect(result.totalPH).toBe(50);
      expect(redisService.set).toHaveBeenCalled();
    });

    it("should throw NotFoundException when character not found", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(null);

      await expect(
        service.getBattleAnalytics({ characterId: "nonexistent" }, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return zeros when no characters found", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.getBattleAnalytics({}, mockUserId);

      expect(result).toEqual({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      });
    });

    it("should count wins and losses correctly with multiple battles", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );

      const lossBattle = {
        ...mockBattle,
        id: "b-2",
        winningTeam: 2,
        losingTeam: 1,
        warriors: [
          { ...mockWarrior1, ph: 0 },
          { ...mockWarrior2, team: 2 },
        ],
      };

      drizzleService.db.query.battles.findMany.mockResolvedValue([
        mockBattle,
        lossBattle,
      ]);

      const result = await service.getBattleAnalytics(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.wins).toBe(1);
      expect(result.losses).toBe(1);
      expect(result.winRatio).toBe(50);
      expect(result.totalPH).toBe(50);
    });
  });

  describe("calculateProfessionWinRate", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify([
        { prof: "mage", wins: 5, losses: 3, totalBattles: 8, winRate: 62.5 },
      ]);
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.calculateProfessionWinRate(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should calculate profession win rates from database", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([mockBattle]);

      const result = await service.calculateProfessionWinRate(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toHaveLength(1);
      expect(result[0].prof).toBe("mage");
      expect(result[0].wins).toBe(1);
      expect(result[0].losses).toBe(0);
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.calculateProfessionWinRate({}, mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("getCurrentStreak", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify({
        current: { type: "wins", count: 3 },
        longest: { wins: 5, losses: 2 },
      });
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should calculate streak from database", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );

      const winBattles = [
        { ...mockBattle, id: "b-1", createdAt: new Date("2024-01-03") },
        { ...mockBattle, id: "b-2", createdAt: new Date("2024-01-02") },
        { ...mockBattle, id: "b-3", createdAt: new Date("2024-01-01") },
      ];

      drizzleService.db.query.battles.findMany.mockResolvedValue(winBattles);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.current.type).toBe("wins");
      expect(result.current.count).toBe(3);
      expect(result.longest.wins).toBe(3);
    });

    it("should return none streak when no battles", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([]);

      const result = await service.getCurrentStreak(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.current.type).toBe("none");
      expect(result.current.count).toBe(0);
    });
  });

  describe("getBattleDurationStats", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify({
        avgWinDuration: 500,
        avgLossDuration: 300,
        fastest: { duration: 100, battleId: "b-1" },
        longest: { duration: 1000, battleId: "b-2" },
      });
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should calculate duration stats from database", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.avgWinDuration).toBe(1000);
      expect(result.avgLossDuration).toBe(0);
      expect(result.fastest).toEqual({
        duration: 1000,
        battleId: "b-1",
      });
    });

    it("should return zeros when no battles", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([]);

      const result = await service.getBattleDurationStats(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.avgWinDuration).toBe(0);
      expect(result.avgLossDuration).toBe(0);
      expect(result.fastest).toBeNull();
      expect(result.longest).toBeNull();
    });
  });

  describe("getPhGrowthTimeSeries", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify([
        {
          date: "2024-01-01T00:00:00.000Z",
          ph: 50,
          cumulativePh: 50,
          battleId: "b-1",
        },
      ]);
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getPhGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should omit battle filters from rating cache keys", async () => {
      const cachedData = JSON.stringify([]);
      redisService.get.mockResolvedValue(cachedData);

      await service.getRatingGrowthTimeSeries(
        {
          characterId: mockCharacterId,
          world: mockWorld,
          period: "all",
          minLevel: 0,
          maxLevel: 0,
          ph: true,
          matchmaking: true,
        },
        mockUserId,
      );

      expect(redisService.get).toHaveBeenCalledWith(
        `statistics:rating-growth:${mockUserId}:${mockCharacterId}:${mockWorld}:all:0-0`,
      );
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.getPhGrowthTimeSeries({}, mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("getHeadToHead", () => {
    it("should return empty records when no characters found", async () => {
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.getHeadToHead({ size: 5 }, mockUserId);

      expect(result.records).toEqual([]);
      expect(result.pagination.size).toBe(5);
      expect(result.pagination.hasNext).toBe(false);
    });

    it("should calculate head to head stats", async () => {
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([mockBattle]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.records).toHaveLength(1);
      expect(result.records[0].opponentName).toBe("Opponent1");
      expect(result.records[0].wins).toBe(1);
      expect(result.records[0].losses).toBe(0);
    });
  });

  describe("getRatingGrowthTimeSeries", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify([
        {
          date: "2024-01-01T00:00:00.000Z",
          ratingDelta: 25,
          rating: 1500,
          battleId: "b-1",
        },
      ]);
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getRatingGrowthTimeSeries(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.getRatingGrowthTimeSeries({}, mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("getRatingDeltaByOpponent", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify([
        {
          opponentId: "opponent-1",
          opponentName: "Opponent1",
          totalRatingDelta: 50,
          wins: 2,
          losses: 0,
        },
      ]);
      redisService.get.mockResolvedValue(cachedData);

      const result = await service.getRatingDeltaByOpponent(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.getRatingDeltaByOpponent({}, mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("getPlayerVsPlayerBattles", () => {
    it("should return empty when no characters found", async () => {
      drizzleService.db.query.userCharacters.findMany.mockResolvedValue([]);

      const result = await service.getPlayerVsPlayerBattles(
        { opponentId: "opponent-1", size: 5 },
        mockUserId,
      );

      expect(result.battles).toEqual([]);
      expect(result.pagination.size).toBe(5);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe("invalidateAnalyticsCache", () => {
    it("should delete matching cache keys", async () => {
      const mockRedisClient = {
        keys: vi.fn().mockResolvedValue(["key1", "key2"]),
        del: vi.fn().mockResolvedValue(2),
      };
      redisService.getClient.mockReturnValue(mockRedisClient as any);

      await service.invalidateAnalyticsCache(mockUserId);

      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith("key1", "key2");
    });

    it("should handle empty keys gracefully", async () => {
      const mockRedisClient = {
        keys: vi.fn().mockResolvedValue([]),
        del: vi.fn(),
      };
      redisService.getClient.mockReturnValue(mockRedisClient as any);

      await service.invalidateAnalyticsCache(mockUserId);

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
