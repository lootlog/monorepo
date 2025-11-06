import { Test, type TestingModule } from '@nestjs/testing';
import { PaginationService } from './pagination.service';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { SortOrder } from '../dto/query-battles.dto';

describe('PaginationService', () => {
  let service: PaginationService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockBattles = [
    {
      id: '1',
      accountId: 'acc1',
      characterId: 'char1',
      world: 'world1',
      duration: 1000,
      createdAt: new Date('2024-01-01'),
      type: '1v1',
      warriors: [],
    },
    {
      id: '2',
      accountId: 'acc1',
      characterId: 'char1',
      world: 'world1',
      duration: 2000,
      createdAt: new Date('2024-01-02'),
      type: '1v1',
      warriors: [],
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      battle: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  describe('cursor pagination', () => {
    it('should return paginated results without cursor', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          sortOrder: SortOrder.DESC,
          includeTotal: false,
        },
      );

      expect(result.data).toEqual(mockBattles);
      expect(result.pagination).toMatchObject({
        size: 2,
        hasNext: false,
        hasPrev: false,
      });
      expect(result.performance.queryTime).toBeDefined();
    });

    it('should return paginated results with next cursor when more results exist', async () => {
      const battlesWithExtra = [...mockBattles, { ...mockBattles[0], id: '3' }];
      prismaService.battle.findMany.mockResolvedValue(battlesWithExtra);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          sortOrder: SortOrder.DESC,
          includeTotal: false,
        },
      );

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        size: 2,
        hasNext: true,
        hasPrev: false,
        nextCursor: '2',
      });
    });

    it('should handle cursor parameter correctly', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          cursor: '1',
          sortOrder: SortOrder.DESC,
          includeTotal: false,
        },
      );

      expect(result.pagination.hasPrev).toBe(true);
      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'acc1',
            id: {
              lt: '1',
            },
          }),
        }),
      );
    });

    it('should work without includeTotal', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          sortOrder: SortOrder.DESC,
          includeTotal: false,
        },
      );

      expect(result.pagination.total).toBeUndefined();
      expect(result.performance.countTime).toBeUndefined();
      expect(prismaService.battle.count).not.toHaveBeenCalled();
    });
  });

  describe('sorting', () => {
    it('should apply ASC sorting', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      await service.paginateBattles(
        {},
        {
          size: 10,
          sortOrder: SortOrder.ASC,
          includeTotal: false,
        },
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: 'asc' },
        }),
      );
    });

    it('should apply DESC sorting', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      await service.paginateBattles(
        {},
        {
          size: 10,
          sortOrder: SortOrder.DESC,
          includeTotal: false,
        },
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: 'desc' },
        }),
      );
    });
  });

  describe('performance metrics', () => {
    it('should track query time', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        {},
        {
          size: 10,
          sortOrder: SortOrder.DESC,
          includeTotal: false,
        },
      );

      expect(result.performance.queryTime).toBeDefined();
      expect(typeof result.performance.queryTime).toBe('number');
    });

    it('should track count time when includeTotal is true', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);
      prismaService.$queryRaw.mockResolvedValue([
        { estimated_count: BigInt(100) },
      ]);

      const result = await service.paginateBattles(
        {},
        {
          size: 10,
          sortOrder: SortOrder.DESC,
          includeTotal: true,
        },
      );

      expect(result.performance.countTime).toBeDefined();
      expect(typeof result.performance.countTime).toBe('number');
      expect(result.pagination.total).toBe(100);
    });

    it('should use estimated count for queries without filters', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);
      prismaService.$queryRaw.mockResolvedValue([
        { estimated_count: BigInt(1000) },
      ]);

      const result = await service.paginateBattles(
        {},
        {
          size: 10,
          sortOrder: SortOrder.DESC,
          includeTotal: true,
        },
      );

      expect(result.pagination.total).toBe(1000);
      expect(prismaService.$queryRaw).toHaveBeenCalled();
      expect(prismaService.battle.count).not.toHaveBeenCalled();
    });

    it('should use exact count for queries with filters', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);
      prismaService.battle.count.mockResolvedValue(50);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 10,
          sortOrder: SortOrder.DESC,
          includeTotal: true,
        },
      );

      expect(result.pagination.total).toBe(50);
      expect(prismaService.battle.count).toHaveBeenCalled();
      expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
