import { Test, type TestingModule } from "@nestjs/testing";
import { PaginationService } from "./pagination.service.js";
import { DrizzleService } from "#src/shared/modules/drizzle/drizzle.service";

describe("PaginationService", () => {
  let service: PaginationService;
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
    const mockDrizzleService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: DrizzleService,
          useValue: mockDrizzleService,
        },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
    drizzleService = module.get(DrizzleService);
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
