import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  makeBattlePagination,
  type BattlePagination,
} from "./pagination.service.js";
import type { DrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import {
  effectDatabaseBoundary,
  runEffectService,
} from "../../../test/effect-service.js";

describe("battle pagination", () => {
  let service: ReturnType<typeof runEffectService<BattlePagination>>;
  let drizzleService: { db: any; run: ReturnType<typeof mock> };

  const mockBattles = [
    {
      id: "1",
      accountId: "acc1",
      characterId: "char1",
      world: "world1",
      duration: 1000,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      type: "1v1",
      public: false,
      userId: "user1",
      semanticFingerprint: null,
      submissionId: null,
      winner: "winner",
      loser: "loser",
      winningTeam: 1,
      losingTeam: 2,
      honorPoints: 0,
      hasFlee: false,
      matchmaking: false,
      statistics: {},
      difficultyRank: null,
      result: null,
      ratingDelta: null,
      opponentLvl: null,
      opponentOplvl: null,
      opponentRating: null,
      rating: null,
      status: null,
      pointsGained: null,
      placementCur: null,
      placementMax: null,
      dailyStageId: null,
      dailyPointsCur: null,
      dailyPointsMax: null,
      dailyPointsStep: null,
      dailyRewardsLast: null,
      dailyRewardsCur: null,
      dailyRewardsMax: null,
      warriors: [],
    },
    {
      id: "2",
      accountId: "acc1",
      characterId: "char1",
      world: "world1",
      duration: 2000,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      type: "1v1",
      public: false,
      userId: "user1",
      semanticFingerprint: null,
      submissionId: null,
      winner: "winner",
      loser: "loser",
      winningTeam: 1,
      losingTeam: 2,
      honorPoints: 0,
      hasFlee: false,
      matchmaking: false,
      statistics: {},
      difficultyRank: null,
      result: null,
      ratingDelta: null,
      opponentLvl: null,
      opponentOplvl: null,
      opponentRating: null,
      rating: null,
      status: null,
      pointsGained: null,
      placementCur: null,
      placementMax: null,
      dailyStageId: null,
      dailyPointsCur: null,
      dailyPointsMax: null,
      dailyPointsStep: null,
      dailyRewardsLast: null,
      dailyRewardsCur: null,
      dailyRewardsMax: null,
      warriors: [],
    },
  ];

  beforeEach(() => {
    const mockDrizzleService = {
      run: mock((query) => Promise.resolve(query)),
      db: {
        query: {
          battles: {
            findMany: mock(),
          },
        },
        select: mock().mockReturnValue({
          from: mock().mockReturnValue({
            where: mock(),
          }),
        }),
        execute: mock(),
      },
    };

    service = runEffectService(
      makeBattlePagination(
        effectDatabaseBoundary(
          mockDrizzleService.db,
        ) as unknown as DrizzleDatabase,
      ),
    );
    drizzleService = mockDrizzleService;
  });

  describe("cursor pagination", () => {
    it("should return paginated results without cursor", async () => {
      drizzleService.db.query.battles.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(() => undefined, {
        size: 2,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.data).toEqual(mockBattles);
      expect(result.pagination).toMatchObject({
        size: 2,
        hasNext: false,
        hasPrev: false,
      });
    });

    it("should return paginated results with next cursor when more results exist", async () => {
      const battlesWithExtra = [...mockBattles, { ...mockBattles[0], id: "3" }];
      drizzleService.db.query.battles.findMany.mockResolvedValue(
        battlesWithExtra,
      );

      const result = await service.paginateBattles(() => undefined, {
        size: 2,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        size: 2,
        hasNext: true,
        hasPrev: false,
        nextCursor: `${new Date("2024-01-02").toISOString()}_2`,
      });
    });

    it("should return previous cursor when cursor has a previous page", async () => {
      const currentCursor = `${new Date("2024-01-04").toISOString()}_4`;
      const previousWindow = [
        { ...mockBattles[0], id: "4", createdAt: new Date("2024-01-04") },
        { ...mockBattles[0], id: "3", createdAt: new Date("2024-01-03") },
        { ...mockBattles[0], id: "2", createdAt: new Date("2024-01-02") },
      ];
      drizzleService.db.query.battles.findMany
        .mockResolvedValueOnce(mockBattles)
        .mockResolvedValueOnce(previousWindow);

      const result = await service.paginateBattles(() => undefined, {
        cursor: currentCursor,
        size: 2,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.pagination).toMatchObject({
        size: 2,
        hasPrev: true,
        previousCursor: `${new Date("2024-01-02").toISOString()}_2`,
      });
    });

    it("should not return previous cursor for the first cursor page", async () => {
      const currentCursor = `${new Date("2024-01-02").toISOString()}_2`;
      const previousWindow = [
        { ...mockBattles[0], id: "2", createdAt: new Date("2024-01-02") },
        { ...mockBattles[0], id: "1", createdAt: new Date("2024-01-01") },
      ];
      drizzleService.db.query.battles.findMany
        .mockResolvedValueOnce(mockBattles)
        .mockResolvedValueOnce(previousWindow);

      const result = await service.paginateBattles(() => undefined, {
        cursor: currentCursor,
        size: 2,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.pagination).toMatchObject({
        size: 2,
        hasPrev: true,
        previousCursor: undefined,
      });
    });

    it("should ignore invalid cursors when reporting previous page state", async () => {
      drizzleService.db.query.battles.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(() => undefined, {
        cursor: "invalid-cursor",
        size: 2,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.pagination).toMatchObject({
        size: 2,
        hasPrev: false,
        previousCursor: undefined,
      });
      expect(drizzleService.db.query.battles.findMany).toHaveBeenCalledTimes(1);
    });

    it("should work without includeTotal", async () => {
      drizzleService.db.query.battles.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(() => undefined, {
        size: 2,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.pagination.total).toBeUndefined();
      expect(result.performance.countTime).toBeUndefined();
    });
  });
});
