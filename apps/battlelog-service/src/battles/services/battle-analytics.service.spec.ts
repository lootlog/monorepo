import type { Mocked } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { BattleAnalyticsService } from "./battle-analytics.service.js";
import { BattleAnalyticsCacheService } from "./battle-analytics-cache.service.js";
import { BattleAnalyticsDomainService } from "./battle-analytics-domain.service.js";
import { BattleAnalyticsPagingService } from "./battle-analytics-paging.service.js";
import { BattleAnalyticsQueryService } from "./battle-analytics-query.service.js";
import { AbyssSeasonCalculatorService } from "./abyss-season-calculator.service.js";
import { BattleSummaryCalculatorService } from "./battle-summary-calculator.service.js";
import { CombatProfileCalculatorService } from "./combat-profile-calculator.service.js";
import { HeadToHeadCalculatorService } from "./head-to-head-calculator.service.js";
import { PlayerVsPlayerCalculatorService } from "./player-vs-player-calculator.service.js";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";
import { RedisService } from "@lootlog/nest-shared/redis";

describe("BattleAnalyticsService", () => {
  let service: BattleAnalyticsService;
  let queryService: BattleAnalyticsQueryService;
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
      deleteByPattern: vi.fn(),
      getOrSetJsonBestEffort: vi.fn(
        ({ factory }: { factory: () => Promise<unknown> }) => factory(),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattleAnalyticsService,
        BattleAnalyticsCacheService,
        BattleAnalyticsDomainService,
        BattleAnalyticsPagingService,
        BattleAnalyticsQueryService,
        AbyssSeasonCalculatorService,
        BattleSummaryCalculatorService,
        CombatProfileCalculatorService,
        HeadToHeadCalculatorService,
        PlayerVsPlayerCalculatorService,
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
    queryService = module.get<BattleAnalyticsQueryService>(
      BattleAnalyticsQueryService,
    );
    drizzleService = module.get(DrizzleService);
    redisService = module.get(RedisService) as Mocked<RedisService>;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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
        `analytics:${mockUserId}:${mockCharacterId}:all:all:all:all:0-0:all:all`,
      );
    });

    it("should keep matchmaking false distinct in cache keys", async () => {
      const cachedData = JSON.stringify({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      });
      redisService.get.mockResolvedValue(cachedData);

      await service.getBattleAnalytics(
        { characterId: mockCharacterId, matchmaking: false },
        mockUserId,
      );

      expect(redisService.get).toHaveBeenCalledWith(
        `analytics:${mockUserId}:${mockCharacterId}:all:all:all:all:any-any:all:not-matchmaking`,
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
        `statistics:rating-growth:${mockUserId}:${mockCharacterId}:${mockWorld}:all:all:all:0-0`,
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

      const result = await service.getHeadToHead({ size: 10 }, mockUserId);

      expect(result.records).toEqual([]);
      expect(result.pagination.size).toBe(10);
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
      expect(result.records[0].lastBattleResult).toBe("won");
      expect(result.records[0].lastBattleUserWarrior.name).toBe("TestPlayer");
      expect(result.records[0].lastBattleOpponentWarrior.name).toBe(
        "Opponent1",
      );
    });

    it("should keep aggregate stats and use the latest battle snapshot for presentation fields", async () => {
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );

      const olderWinBattle = {
        ...mockBattle,
        id: "b-1",
        createdAt: new Date("2024-01-01"),
        warriors: [
          {
            ...mockWarrior1,
            battleId: "b-1",
            fireDamage: 10,
            woundDamageTaken: 1,
          },
          {
            ...mockWarrior2,
            battleId: "b-1",
            name: "OpponentOld",
            lvl: 95,
            frostDamage: 20,
          },
        ],
      };
      const newerLossBattle = {
        ...mockBattle,
        id: "b-2",
        winner: "OpponentPrime",
        loser: "TestPlayer",
        winningTeam: 2,
        losingTeam: 1,
        createdAt: new Date("2024-01-03"),
        warriors: [
          {
            ...mockWarrior1,
            battleId: "b-2",
            poisonDamageTaken: 6,
            woundDamageTaken: 9,
          },
          {
            ...mockWarrior2,
            battleId: "b-2",
            name: "OpponentPrime",
            lvl: 97,
            frostDamage: 77,
            lightningDamage: 12,
          },
        ],
      };

      drizzleService.db.query.battles.findMany.mockResolvedValue([
        olderWinBattle,
        newerLossBattle,
      ]);

      const result = await service.getHeadToHead(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toEqual(
        expect.objectContaining({
          opponentName: "OpponentPrime",
          opponentLvl: 97,
          wins: 1,
          losses: 1,
          totalBattles: 2,
          lastBattleDate: "2024-01-03T00:00:00.000Z",
          lastBattleResult: "lost",
        }),
      );
      expect(result.records[0].lastBattleUserWarrior).toEqual(
        expect.objectContaining({
          name: "TestPlayer",
          poisonDamageTaken: 6,
          woundDamageTaken: 9,
        }),
      );
      expect(result.records[0].lastBattleOpponentWarrior).toEqual(
        expect.objectContaining({
          name: "OpponentPrime",
          lvl: 97,
          frostDamage: 77,
          lightningDamage: 12,
        }),
      );
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

  describe("getAbyssSeasons", () => {
    it("should group matchmaking battles into seasons after a 14 day gap", async () => {
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([
        {
          ...mockBattle,
          id: "season-one-win",
          createdAt: new Date("2024-01-01T19:00:00.000Z"),
          rating: 1000,
          ratingDelta: 10,
          pointsGained: 5,
          warriors: [
            { ...mockWarrior1, battleId: "season-one-win", team: 1 },
            { ...mockWarrior2, battleId: "season-one-win", team: 2 },
          ],
        },
        {
          ...mockBattle,
          id: "season-one-loss",
          winningTeam: 2,
          losingTeam: 1,
          createdAt: new Date("2024-01-02T19:00:00.000Z"),
          rating: 992,
          ratingDelta: -8,
          pointsGained: null,
          warriors: [
            { ...mockWarrior1, battleId: "season-one-loss", team: 1 },
            { ...mockWarrior2, battleId: "season-one-loss", team: 2 },
          ],
        },
        {
          ...mockBattle,
          id: "season-two-win",
          createdAt: new Date("2024-01-25T19:00:00.000Z"),
          rating: 1010,
          ratingDelta: 12,
          pointsGained: 7,
          warriors: [
            { ...mockWarrior1, battleId: "season-two-win", team: 1 },
            { ...mockWarrior2, battleId: "season-two-win", team: 2 },
          ],
        },
      ]);

      const result = await service.getAbyssSeasons(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          startedAt: "2024-01-25T19:00:00.000Z",
          endedAt: "2024-01-25T19:00:00.000Z",
          totalBattles: 1,
          wins: 1,
          losses: 0,
          winRate: 100,
          totalRatingDelta: 12,
          peakRating: 1010,
          totalPointsGained: 7,
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          startedAt: "2024-01-01T19:00:00.000Z",
          endedAt: "2024-01-02T19:00:00.000Z",
          totalBattles: 2,
          wins: 1,
          losses: 1,
          winRate: 50,
          totalRatingDelta: 2,
          peakRating: 1000,
          totalPointsGained: 5,
        }),
      );
    });
  });

  describe("getCombatProfile", () => {
    it("should not include counters in mitigation mix", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([
        {
          ...mockBattle,
          warriors: [
            {
              ...mockWarrior1,
              damageDealtAfterDefensive: 300,
              damageTaken: 200,
              blockedDamage: 100,
              blocks: 1,
              evasions: 0,
              counters: 3,
              turns: 2,
              turnsLost: 0,
              meleeDamage: 300,
              distanceDamage: 0,
              auxiliaryDamage: 0,
              fireDamage: 0,
              frostDamage: 0,
              lightningDamage: 0,
              thirdAttDamage: 0,
              trueDamageDealt: 0,
              rageDamageDealt: 0,
              stigmaDamageDealt: 0,
              spellsUsedMap: {},
            },
            mockWarrior2,
          ],
        },
      ]);

      const result = await service.getCombatProfile(
        { characterId: mockCharacterId },
        mockUserId,
      );

      expect(result.summary.mitigationRate).toBe(33.33);
      expect(result.mitigationMix).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "blockedDamage", value: 100 }),
          expect.objectContaining({ key: "blocks", value: 1 }),
        ]),
      );
      expect(result.mitigationMix).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ key: "counters" })]),
      );
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
        { opponentId: "opponent-1", size: 10 },
        mockUserId,
      );

      expect(result.battles).toEqual([]);
      expect(result.pagination.size).toBe(10);
      expect(result.pagination.hasNext).toBe(false);
    });

    it("should exclude the current battle and non-1v1 battles", async () => {
      const buildWhereSpy = vi
        .spyOn(queryService, "buildAnalyticsWhere")
        .mockReturnValue(undefined);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([
        {
          ...mockBattle,
          id: "current-battle",
          warriors: [
            { ...mockWarrior1, battleId: "current-battle" },
            { ...mockWarrior2, battleId: "current-battle" },
          ],
        },
        {
          ...mockBattle,
          id: "group-battle",
          type: "group",
          warriors: [
            { ...mockWarrior1, battleId: "group-battle" },
            { ...mockWarrior2, battleId: "group-battle" },
          ],
        },
        {
          ...mockBattle,
          id: "previous-battle",
          hasFlee: true,
          matchmaking: false,
          opponentRating: null,
          rating: null,
          ratingDelta: null,
          warriors: [
            {
              ...mockWarrior1,
              battleId: "previous-battle",
              fireDamage: 11,
              frostDamage: 12,
              lightningDamage: 13,
              poisonDamageTaken: 14,
              woundDamageTaken: 15,
              critWoundDamageTaken: 16,
            },
            {
              ...mockWarrior2,
              battleId: "previous-battle",
              fireDamage: 21,
              frostDamage: 22,
              lightningDamage: 23,
              poisonDamageTaken: 24,
              woundDamageTaken: 25,
              critWoundDamageTaken: 26,
            },
          ],
        },
      ]);

      const result = await service.getPlayerVsPlayerBattles(
        {
          characterId: mockCharacterId,
          world: mockWorld,
          opponentId: "opponent-1",
          excludeBattleId: "current-battle",
          period: "all",
          size: 10,
        },
        mockUserId,
      );

      expect(result.battles).toHaveLength(1);
      expect(result.battles[0]).toEqual(
        expect.objectContaining({
          battleId: "previous-battle",
          hasFlee: true,
          matchmaking: false,
          opponentRating: null,
          ratingDelta: null,
          userRating: null,
          userWarrior: expect.objectContaining({
            fireDamage: 11,
            frostDamage: 12,
            lightningDamage: 13,
            poisonDamageTaken: 14,
            woundDamageTaken: 15,
            critWoundDamageTaken: 16,
          }),
          opponentWarrior: expect.objectContaining({
            fireDamage: 21,
            frostDamage: 22,
            lightningDamage: 23,
            poisonDamageTaken: 24,
            woundDamageTaken: 25,
            critWoundDamageTaken: 26,
          }),
        }),
      );
      expect(result.pagination.size).toBe(10);
      expect(result.pagination.hasNext).toBe(false);
      drizzleService.db.query.battles.findMany.mock.calls[0][0].where.RAW({});
      expect(buildWhereSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ matchmaking: undefined }),
      );
      buildWhereSpy.mockRestore();
    });

    it("should pass explicit matchmaking filter when requested", async () => {
      const buildWhereSpy = vi
        .spyOn(queryService, "buildAnalyticsWhere")
        .mockReturnValue(undefined);
      drizzleService.db.query.userCharacters.findFirst.mockResolvedValue(
        mockUserCharacter,
      );
      drizzleService.db.query.battles.findMany.mockResolvedValue([]);

      await service.getPlayerVsPlayerBattles(
        {
          characterId: mockCharacterId,
          opponentId: "opponent-1",
          matchmaking: true,
          period: "all",
          size: 10,
        },
        mockUserId,
      );

      drizzleService.db.query.battles.findMany.mock.calls[0][0].where.RAW({});
      expect(buildWhereSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ matchmaking: true }),
      );
      buildWhereSpy.mockRestore();
    });
  });

  describe("invalidateAnalyticsCache", () => {
    it("should delete matching cache patterns through RedisService", async () => {
      redisService.deleteByPattern.mockResolvedValue(2);

      await service.invalidateAnalyticsCache(mockUserId);

      expect(redisService.getClient).not.toHaveBeenCalled();
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `analytics:${mockUserId}:*`,
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `statistics:*:${mockUserId}:*`,
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `battle-characters:*:${mockUserId}*`,
      );
      expect(redisService.deleteByPattern).toHaveBeenCalledWith(
        `battle-worlds:${mockUserId}:*`,
      );
    });

    it("should handle empty cache patterns gracefully", async () => {
      redisService.deleteByPattern.mockResolvedValue(0);

      await service.invalidateAnalyticsCache(mockUserId);

      expect(redisService.deleteByPattern).toHaveBeenCalledTimes(4);
    });
  });
});
