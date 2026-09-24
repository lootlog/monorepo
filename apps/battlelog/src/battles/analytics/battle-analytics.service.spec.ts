import { makeBattleAnalyticsRead } from "./battle-analytics-read.service.js";
import { makeBattleCombatProfileRead } from "./battle-combat-profile-read.service.js";
import { unusedRedisStore } from "../../../test/battle-fixtures.js";
import { Effect } from "effect";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ResourceNotFoundError } from "#src/infrastructure/http-error";
import {
  makeBattleAnalytics,
  type BattleAnalytics,
} from "./battle-analytics.service.js";
import { makeBattleAnalyticsCache } from "./battle-analytics-cache.service.js";
import {
  makeBattleAnalyticsQuery,
  type BattleAnalyticsQuery,
} from "./battle-analytics-query.service.js";
import type { RedisGetOrSetJsonBestEffortOptions } from "#src/infrastructure/redis-store";
import type {
  BattleStatisticsQuery,
  PlayerVsPlayerQuery,
} from "#src/battles/analytics/query-battle-statistics";

const statisticsQuery = (
  overrides: Partial<BattleStatisticsQuery> = {},
): BattleStatisticsQuery => ({
  size: 20,
  sortBy: "totalBattles",
  sortOrder: "desc",
  includeTotal: false,
  ...overrides,
});

const playerVsPlayerQuery = (
  overrides: Pick<PlayerVsPlayerQuery, "opponentId"> &
    Partial<PlayerVsPlayerQuery>,
): PlayerVsPlayerQuery => ({
  ...statisticsQuery(),
  ...overrides,
});

const createDatabaseFixture = () => {
  const mockDrizzleService = {
    run: mock((query) => Promise.resolve(query)),
    db: {
      query: {
        userCharacters: {
          findFirst: mock(),
          findMany: mock(),
        },
        battles: {
          findMany: mock(),
        },
      },
      select: mock().mockReturnValue({
        from: mock().mockReturnValue({
          where: mock(),
        }),
      }),
    },
  };

  return mockDrizzleService;
};

const createRedisFixture = () => {
  const mockRedisService = {
    ...unusedRedisStore,
    eval: mock().mockResolvedValue("test-generation"),
    get: mock().mockResolvedValue(null),
    set: mock().mockResolvedValue(undefined),
    getClient: mock(),
    getOrSetJsonBestEffort: async <T>({
      key,
      factory,
      codec,
    }: RedisGetOrSetJsonBestEffortOptions<T>): Promise<T> => {
      const cached = await mockRedisService.get(key);

      if (cached !== null) return codec.parse(cached);
      const result = await factory();
      await mockRedisService.set(key, JSON.stringify(result), 300);

      return result;
    },
  };

  return mockRedisService;
};

describe("battle analytics", () => {
  let service: BattleAnalytics;
  let queryService: BattleAnalyticsQuery;
  let drizzleService: ReturnType<typeof createDatabaseFixture>;
  let redisService: ReturnType<typeof createRedisFixture>;
  const mockUserId = "user-123";
  const mockCharacterId = "char-123";
  const mockWorld = "world1";

  beforeEach(() => {
    const mockDrizzleService = createDatabaseFixture();

    const mockRedisService = createRedisFixture();

    const drizzle = mockDrizzleService.db;
    const redis = mockRedisService;
    const cacheService = makeBattleAnalyticsCache(redis);
    queryService = makeBattleAnalyticsQuery(drizzle);
    service = makeBattleAnalytics(
      makeBattleAnalyticsRead(drizzle, queryService),
      makeBattleCombatProfileRead(drizzle, queryService),
      cacheService,
      queryService,
      (effect) => effect,
    );
    drizzleService = mockDrizzleService;
    redisService = mockRedisService;
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

      const result = await Effect.runPromise(
        service.getBattleAnalytics(
          { characterId: mockCharacterId },
          mockUserId,
        ),
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

      await Effect.runPromise(
        service.getBattleAnalytics(
          { characterId: mockCharacterId, minLevel: 0, maxLevel: 0 },
          mockUserId,
        ),
      );

      expect(redisService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `analytics:${mockUserId}:${mockCharacterId}:all:all:all:all:0-0:all:all`,
        ),
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

      await Effect.runPromise(
        service.getBattleAnalytics(
          { characterId: mockCharacterId, matchmaking: false },
          mockUserId,
        ),
      );

      expect(redisService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `analytics:${mockUserId}:${mockCharacterId}:all:all:all:all:any-any:all:not-matchmaking`,
        ),
      );
    });

    it("should throw ResourceNotFoundError when character not found", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findFirst.mockReturnValue(
        Effect.succeed(null),
      );

      await expect(
        Effect.runPromise(
          service.getBattleAnalytics(
            { characterId: "nonexistent" },
            mockUserId,
          ),
        ),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it("should return zeros when no characters found", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getBattleAnalytics({}, mockUserId),
      );

      expect(result).toEqual({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      });
    });
  });

  describe("calculateProfessionWinRate", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify([
        { prof: "mage", wins: 5, losses: 3, totalBattles: 8, winRate: 62.5 },
      ]);

      redisService.get.mockResolvedValue(cachedData);

      const result = await Effect.runPromise(
        service.calculateProfessionWinRate(
          statisticsQuery({ characterId: mockCharacterId }),
          mockUserId,
        ),
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.calculateProfessionWinRate(statisticsQuery(), mockUserId),
      );

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

      const result = await Effect.runPromise(
        service.getCurrentStreak(
          statisticsQuery({ characterId: mockCharacterId }),
          mockUserId,
        ),
      );

      expect(result).toEqual(JSON.parse(cachedData));
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

      const result = await Effect.runPromise(
        service.getBattleDurationStats(
          statisticsQuery({ characterId: mockCharacterId }),
          mockUserId,
        ),
      );

      expect(result).toEqual(JSON.parse(cachedData));
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

      const result = await Effect.runPromise(
        service.getPhGrowthTimeSeries(
          statisticsQuery({ characterId: mockCharacterId }),
          mockUserId,
        ),
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should retain PH and normalize matchmaking in rating cache keys", async () => {
      const cachedData = JSON.stringify([]);
      redisService.get.mockResolvedValue(cachedData);

      await Effect.runPromise(
        service.getRatingGrowthTimeSeries(
          statisticsQuery({
            characterId: mockCharacterId,
            world: mockWorld,
            period: "all",
            minLevel: 0,
            maxLevel: 0,
            ph: true,
            matchmaking: true,
          }),
          mockUserId,
        ),
      );

      expect(redisService.get).toHaveBeenCalledWith(
        expect.stringContaining(
          `statistics:rating-growth:${mockUserId}:${mockCharacterId}:${mockWorld}:all:all:all:0-0:ph:matchmaking`,
        ),
      );
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getPhGrowthTimeSeries(statisticsQuery(), mockUserId),
      );

      expect(result).toEqual([]);
    });
  });

  describe("getHeadToHead", () => {
    it("should return empty records when no characters found", async () => {
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getHeadToHead(statisticsQuery({ size: 10 }), mockUserId),
      );

      expect(result.records).toEqual([]);
      expect(result.pagination.size).toBe(10);
      expect(result.pagination.hasNext).toBe(false);
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

      const result = await Effect.runPromise(
        service.getRatingGrowthTimeSeries(
          statisticsQuery({ characterId: mockCharacterId }),
          mockUserId,
        ),
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getRatingGrowthTimeSeries(statisticsQuery(), mockUserId),
      );

      expect(result).toEqual([]);
    });
  });

  describe("getAbyssSeasons", () => {});

  describe("getCombatProfile", () => {});

  describe("getRatingDeltaByOpponent", () => {
    it("should return cached result if available", async () => {
      const cachedData = JSON.stringify([
        {
          opponentId: "opponent-1",
          opponentName: "Opponent1",
          opponentIcon: "warrior.gif",
          opponentProf: "w",
          opponentLvl: 100,
          totalRatingDelta: 50,
          wins: 2,
          losses: 0,
          totalBattles: 2,
          avgRatingDelta: 25,
          lastBattleDate: "2024-01-01T00:00:00.000Z",
        },
      ]);

      redisService.get.mockResolvedValue(cachedData);

      const result = await Effect.runPromise(
        service.getRatingDeltaByOpponent(
          statisticsQuery({ characterId: mockCharacterId }),
          mockUserId,
        ),
      );

      expect(result).toEqual(JSON.parse(cachedData));
    });

    it("should return empty array when no characters", async () => {
      redisService.get.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getRatingDeltaByOpponent(statisticsQuery(), mockUserId),
      );

      expect(result).toEqual([]);
    });
  });

  describe("getPlayerVsPlayerBattles", () => {
    it("should return empty when no characters found", async () => {
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getPlayerVsPlayerBattles(
          playerVsPlayerQuery({ opponentId: "opponent-1", size: 10 }),
          mockUserId,
        ),
      );

      expect(result.battles).toEqual([]);
      expect(result.pagination.size).toBe(10);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe("invalidateAnalyticsCache", () => {
    it("does not fail a persisted write when invalidation is unavailable", async () => {
      redisService.set.mockRejectedValue(new Error("Redis unavailable"));
      await expect(
        Effect.runPromise(service.invalidateAnalyticsCache(mockUserId)),
      ).resolves.toBeUndefined();
    });
  });
});
