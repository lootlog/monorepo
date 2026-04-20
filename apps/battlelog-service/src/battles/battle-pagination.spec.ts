import { BattlePagination } from "./battle-pagination.js";

describe("BattlePagination", () => {
  let service: BattlePagination;
  let drizzleService: { db: any };

  const mockBattles = [
    {
      id: "1",
      accountId: "acc1",
      characterId: "char1",
      world: "world1",
      duration: 1000,
      createdAt: new Date("2024-01-01"),
      type: "1v1",
      warriors: [],
    },
    {
      id: "2",
      accountId: "acc1",
      characterId: "char1",
      world: "world1",
      duration: 2000,
      createdAt: new Date("2024-01-02"),
      type: "1v1",
      warriors: [],
    },
  ];

  beforeEach(async () => {
    const mockDrizzleDatabase = {
      db: {
        query: {
          battles: {
            findMany: vi.fn(),
          },
        },
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
        execute: vi.fn(),
      },
    };

    service = new BattlePagination(mockDrizzleDatabase as never);
    drizzleService = mockDrizzleDatabase;
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
      expect(result.performance.queryTime).toBeDefined();
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

  describe("performance metrics", () => {
    it("should track query time", async () => {
      drizzleService.db.query.battles.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(() => undefined, {
        size: 10,
        sortOrder: "desc",
        includeTotal: false,
      });

      expect(result.performance.queryTime).toBeDefined();
      expect(typeof result.performance.queryTime).toBe("number");
    });

    it("should track count time when includeTotal is true", async () => {
      drizzleService.db.query.battles.findMany.mockResolvedValue(mockBattles);
      drizzleService.db.execute.mockResolvedValue({
        rows: [{ estimated_count: "100" }],
      });

      const result = await service.paginateBattles(() => undefined, {
        size: 10,
        sortOrder: "desc",
        includeTotal: true,
      });

      expect(result.performance.countTime).toBeDefined();
      expect(typeof result.performance.countTime).toBe("number");
      expect(result.pagination.total).toBe(100);
    });
  });
});
