import type { CacheFillOptions } from "@lootlog/database/redis-cache-fill";
import { makeBattleAnalyticsRead } from "./battle-analytics-read.service.js";
import { makeBattleCombatProfileRead } from "./battle-combat-profile-read.service.js";
import { unusedRedisStore } from "../../../test/battle-fixtures.js";
import { Effect } from "effect";
import { Redis } from "effect/persistence";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ResourceNotFoundError } from "@lootlog/protocol/http/errors";
import {
  makeBattleAnalytics,
  type BattleAnalytics,
} from "./battle-analytics.service.js";
import { makeBattleAnalyticsCache } from "./battle-analytics-cache.service.js";
import {
  makeBattleAnalyticsQuery,
  type BattleAnalyticsQuery,
} from "./battle-analytics-query.service.js";
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
  const cachedValue = mock(
    async (_key: string): Promise<string | null> => null,
  );

  const storeValue = mock(
    async (_key: string, _value: string, _ttlSeconds?: number) => {},
  );

  return {
    ...unusedRedisStore,
    cachedValue,
    storeValue,
    evalScript: <TResult>() =>
      // SAFETY: the analytics cache reads its generation script as a string.
      Effect.succeed("test-generation" as TResult),
    set: (key: string, value: string, ttlSeconds?: number) =>
      Effect.tryPromise({
        try: () => storeValue(key, value, ttlSeconds),
        catch: (cause) => new Redis.RedisError({ cause }),
      }),
    getOrSetJson: <T, E, R>({
      key,
      factory,
      codec,
    }: CacheFillOptions<T, E, R>) =>
      Effect.gen(function* () {
        const cached = yield* Effect.promise(() => cachedValue(key));

        if (cached !== null) return codec.parse(cached);
        const result = yield* factory;
        yield* Effect.promise(() =>
          storeValue(key, JSON.stringify(result), 300),
        );

        return result;
      }),
  };
};

describe("battle analytics", () => {
  let service: BattleAnalytics;
  let queryService: BattleAnalyticsQuery;
  let drizzleService: ReturnType<typeof createDatabaseFixture>;
  let redisService: ReturnType<typeof createRedisFixture>;
  const mockUserId = "user-123";
  const mockCharacterId = "char-123";

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
    it("should keep defined numeric filter values in cache keys", async () => {
      const cachedData = JSON.stringify({
        totalBattles: 0,
        wins: 0,
        losses: 0,
        winRatio: 0,
        totalPH: 0,
      });

      redisService.cachedValue.mockResolvedValue(cachedData);

      await Effect.runPromise(
        service.getBattleAnalytics(
          { characterId: mockCharacterId, minLevel: 0, maxLevel: 0 },
          mockUserId,
        ),
      );

      expect(redisService.cachedValue).toHaveBeenCalledWith(
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

      redisService.cachedValue.mockResolvedValue(cachedData);

      await Effect.runPromise(
        service.getBattleAnalytics(
          { characterId: mockCharacterId, matchmaking: false },
          mockUserId,
        ),
      );

      expect(redisService.cachedValue).toHaveBeenCalledWith(
        expect.stringContaining(
          `analytics:${mockUserId}:${mockCharacterId}:all:all:all:all:any-any:all:not-matchmaking`,
        ),
      );
    });

    it("should throw ResourceNotFoundError when character not found", async () => {
      redisService.cachedValue.mockResolvedValue(null);
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
      redisService.cachedValue.mockResolvedValue(null);
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
    it("should return empty array when no characters", async () => {
      redisService.cachedValue.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.calculateProfessionWinRate(statisticsQuery(), mockUserId),
      );

      expect(result).toEqual([]);
    });
  });

  describe("getPhGrowthTimeSeries", () => {
    it("should return empty array when no characters", async () => {
      redisService.cachedValue.mockResolvedValue(null);
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
    it("should return empty array when no characters", async () => {
      redisService.cachedValue.mockResolvedValue(null);
      drizzleService.db.query.userCharacters.findMany.mockReturnValue(
        Effect.succeed([]),
      );

      const result = await Effect.runPromise(
        service.getRatingGrowthTimeSeries(statisticsQuery(), mockUserId),
      );

      expect(result).toEqual([]);
    });
  });

  describe("getRatingDeltaByOpponent", () => {
    it("should return empty array when no characters", async () => {
      redisService.cachedValue.mockResolvedValue(null);
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
      redisService.storeValue.mockRejectedValue(new Error("Redis unavailable"));
      await expect(
        Effect.runPromise(service.invalidateAnalyticsCache(mockUserId)),
      ).resolves.toBeUndefined();
    });
  });
});
