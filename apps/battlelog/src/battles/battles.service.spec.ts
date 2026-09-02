import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { makeBattles, type Battles } from "./battles.service.js";
import type { DrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import type { BattleObjectStorage } from "#src/shared/modules/r2/r2.service";
import type { BattlePagination } from "./services/pagination.service.js";
import type { BattleAnalytics } from "./services/battle-analytics.service.js";
import { makeBattleListFilter } from "./services/battle-list-filter.service.js";
import { makeBattleMetadata } from "./services/battle-metadata.service.js";
import type { RedisStore } from "#src/shared/modules/redis/redis.service";
import { Effect } from "effect";
import { runEffectService } from "../../test/effect-service.js";

describe("battles module", () => {
  let service: ReturnType<typeof runEffectService<Battles>>;
  let mockDrizzleService: {
    run: ReturnType<typeof mock>;
    db: {
      query: {
        battles: {
          findMany: ReturnType<typeof mock>;
          findFirst: ReturnType<typeof mock>;
        };
        battleWarriors: { findMany: ReturnType<typeof mock> };
        userCharacters: {
          findMany: ReturnType<typeof mock>;
          findFirst: ReturnType<typeof mock>;
        };
      };
      insert: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
      delete: ReturnType<typeof mock>;
      select: ReturnType<typeof mock>;
      selectDistinctOn: ReturnType<typeof mock>;
      execute: ReturnType<typeof mock>;
      transaction: ReturnType<typeof mock>;
    };
  };
  let mockR2Service: {
    uploadBattleData: ReturnType<typeof mock>;
    getBattleData: ReturnType<typeof mock>;
    deleteBattleData: ReturnType<typeof mock>;
  };
  let mockBattleAnalyticsService: {
    getBattleAnalytics: ReturnType<typeof mock>;
    calculateProfessionWinRate: ReturnType<typeof mock>;
    getHeadToHead: ReturnType<typeof mock>;
    getCurrentStreak: ReturnType<typeof mock>;
    getBattleDurationStats: ReturnType<typeof mock>;
    getPhGrowthTimeSeries: ReturnType<typeof mock>;
    invalidateAnalyticsCache: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockDrizzleService = {
      run: mock((query) => Promise.resolve(query)),
      db: {
        query: {
          battles: { findMany: mock(), findFirst: mock() },
          battleWarriors: { findMany: mock() },
          userCharacters: { findMany: mock(), findFirst: mock() },
        },
        insert: mock().mockReturnValue({
          values: mock().mockReturnValue({
            onConflictDoUpdate: mock().mockReturnValue({
              returning: mock(),
            }),
            returning: mock(),
          }),
        }),
        update: mock().mockReturnValue({
          set: mock().mockReturnValue({
            where: mock().mockReturnValue({
              returning: mock(),
            }),
          }),
        }),
        delete: mock().mockReturnValue({
          where: mock().mockReturnValue({
            returning: mock(),
          }),
        }),
        select: mock().mockReturnValue({
          from: mock().mockReturnValue({
            where: mock(),
          }),
        }),
        selectDistinctOn: mock().mockReturnValue({
          from: mock().mockReturnValue({
            where: mock().mockReturnValue({
              orderBy: mock(),
            }),
          }),
        }),
        execute: mock(),
        transaction: mock(),
      },
    };

    mockR2Service = {
      uploadBattleData: mock(),
      getBattleData: mock(),
      deleteBattleData: mock(),
    };

    const mockPaginationService = {
      paginateBattles: mock(() => Effect.die("not configured")),
    };

    mockBattleAnalyticsService = {
      getBattleAnalytics: mock(),
      calculateProfessionWinRate: mock(),
      getHeadToHead: mock(),
      getCurrentStreak: mock(),
      getBattleDurationStats: mock(),
      getPhGrowthTimeSeries: mock(),
      invalidateAnalyticsCache: mock(() => Effect.void),
    };

    const mockRedisService = {
      get: mock(),
      getJson: mock().mockResolvedValue(null),
      set: mock(),
      setJson: mock(),
      setNX: mock().mockResolvedValue(true),
      del: mock(),
      deleteByPattern: mock(),
      eval: mock(),
      getOrSetJsonBestEffort: mock(
        ({ factory }: { factory: () => Promise<unknown> }) => factory(),
      ),
    };

    const drizzle = mockDrizzleService as unknown as DrizzleDatabase;
    const redis = mockRedisService as unknown as RedisStore;
    service = runEffectService(
      makeBattles(
        drizzle,
        mockR2Service as unknown as BattleObjectStorage,
        redis,
        mockPaginationService as unknown as BattlePagination,
        mockBattleAnalyticsService as unknown as BattleAnalytics,
        makeBattleListFilter(drizzle),
        makeBattleMetadata(drizzle, redis),
      ),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("repairs raw storage when a canonical battle already exists", async () => {
    spyOn(service as never, "analyzeBattle").mockReturnValue({
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

    spyOn(service as never, "analyzeBattle").mockReturnValue(analysis as never);
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
