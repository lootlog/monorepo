import {
  unusedRedisStore,
  unusedBattleAnalytics,
} from "../../test/battle-fixtures.js";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { makeBattles, type Battles } from "#src/battles/battles.service";
import { makeBattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import { makeBattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import type { RedisGetOrSetJsonBestEffortOptions } from "#src/infrastructure/redis-store";
import { Effect } from "effect";

const createDatabaseFixture = () => ({
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
});

const createStorageFixture = () => ({
  uploadBattleData: mock(),
  getBattleData: mock(),
  deleteBattleData: mock(),
});

const createAnalyticsFixture = () => ({
  ...unusedBattleAnalytics,
  getBattleAnalytics: mock(),
  calculateProfessionWinRate: mock(),
  getHeadToHead: mock(),
  getCurrentStreak: mock(),
  getBattleDurationStats: mock(),
  getPhGrowthTimeSeries: mock(),
  invalidateAnalyticsCache: mock(() => Effect.void),
});

describe("battles module", () => {
  let service: Battles;
  let mockDrizzleService: ReturnType<typeof createDatabaseFixture>;
  let mockR2Service: ReturnType<typeof createStorageFixture>;
  let mockBattleAnalyticsService: ReturnType<typeof createAnalyticsFixture>;
  beforeEach(() => {
    mockDrizzleService = createDatabaseFixture();

    mockR2Service = createStorageFixture();

    const mockPaginationService = {
      paginateBattles: mock(() => Effect.die("not configured")),
    };

    mockBattleAnalyticsService = createAnalyticsFixture();

    const mockRedisService = {
      ...unusedRedisStore,
      get: mock(),
      getJson: mock().mockResolvedValue(null),
      set: mock(),
      setJson: mock(),
      setNX: mock().mockResolvedValue(true),
      del: mock(),
      deleteByPattern: mock(),
      eval: mock(),
      getOrSetJsonBestEffort: <T>({
        factory,
      }: RedisGetOrSetJsonBestEffortOptions<T>) => factory(),
    };

    const drizzle = mockDrizzleService.db;
    const redis = mockRedisService;
    service = makeBattles(
      drizzle,
      mockR2Service,
      redis,
      mockPaginationService,
      { ...unusedBattleAnalytics, ...mockBattleAnalyticsService },
      makeBattleListFilter(drizzle),
      makeBattleMetadata(drizzle, redis),
    );
  });

  it("repairs raw storage when a canonical battle already exists", async () => {
    mockDrizzleService.db.query.battles.findFirst.mockReturnValueOnce(
      Effect.succeed({
        id: "battle-existing",
      }),
    );

    await expect(
      Effect.runPromise(
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
      ),
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
    const existingBattle = {
      id: "battle-existing",
      warriors: [],
    };

    mockDrizzleService.db.transaction.mockReturnValueOnce(
      Effect.fail(
        Object.assign(
          new Error("duplicate key value violates unique constraint"),
          {
            code: "23505",
          },
        ),
      ),
    );
    mockDrizzleService.db.query.battles.findFirst
      .mockReturnValueOnce(Effect.succeed(null))
      .mockReturnValueOnce(Effect.succeed(existingBattle));

    await expect(
      Effect.runPromise(
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
      ),
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
