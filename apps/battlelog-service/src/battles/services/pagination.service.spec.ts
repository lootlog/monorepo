import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from './pagination.service';
import { PrismaService } from 'src/shared/modules/prisma/prisma.service';
import { PaginationStrategy, SortField, SortOrder } from '../dto/query-battles.dto';

describe('PaginationService', () => {
  let service: PaginationService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockBattles = [
    {
      id: 1,
      accountId: 'acc1',
      characterId: 'char1',
      world: 'world1',
      duration: 1000,
      createdAt: new Date('2024-01-01'),
      type: '1v1',
      warriors: [],
    },
    {
      id: 2,
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

  describe('offset pagination', () => {
    it('should return paginated results with offset strategy', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);
      prismaService.battle.count.mockResolvedValue(10);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          page: 1,
          limit: 2,
          includeTotal: true,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.data).toEqual(mockBattles);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 10,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      });
      expect(result.strategy).toBe(PaginationStrategy.OFFSET);
    });

    it('should handle last page correctly', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);
      prismaService.battle.count.mockResolvedValue(12);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          page: 6,
          limit: 2,
          includeTotal: true,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.pagination).toMatchObject({
        page: 6,
        limit: 2,
        total: 12,
        totalPages: 6,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should work without includeTotal', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          page: 1,
          limit: 2,
          includeTotal: false,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.pagination.total).toBeUndefined();
      expect(result.pagination.totalPages).toBeUndefined();
      expect(prismaService.battle.count).not.toHaveBeenCalled();
    });

    it('should calculate skip correctly for different pages', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      await service.paginateBattles(
        { accountId: 'acc1' },
        {
          page: 3,
          limit: 20,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
    });
  });

  describe('cursor pagination', () => {
    it('should return paginated results with cursor strategy', async () => {
      const battlesWithExtra = [...mockBattles, { ...mockBattles[0], id: 3 }];
      prismaService.battle.findMany.mockResolvedValue(battlesWithExtra);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          strategy: PaginationStrategy.CURSOR,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toMatchObject({
        size: 2,
        hasNext: true,
        hasPrev: false,
      });
      expect(result.pagination.nextCursor).toBeDefined();
      expect(result.strategy).toBe(PaginationStrategy.CURSOR);
    });

    it('should handle cursor parameter', async () => {
      const cursor = Buffer.from(
        JSON.stringify({
          id: 1,
          createdAt: new Date('2024-01-01'),
        }),
      ).toString('base64');

      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          cursor,
          strategy: PaginationStrategy.CURSOR,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should not return nextCursor when no more results', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 5,
          strategy: PaginationStrategy.CURSOR,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.nextCursor).toBeUndefined();
    });

    it('should handle invalid cursor gracefully', async () => {
      const invalidCursor = 'invalid-base64-cursor';

      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      await service.paginateBattles(
        { accountId: 'acc1' },
        {
          size: 2,
          cursor: invalidCursor,
          strategy: PaginationStrategy.CURSOR,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(prismaService.battle.findMany).toHaveBeenCalled();
    });
  });

  describe('auto pagination strategy', () => {
    it('should use cursor pagination when cursor is provided', async () => {
      const cursor = Buffer.from(JSON.stringify({ id: 1 })).toString('base64');
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        {},
        {
          cursor,
          strategy: PaginationStrategy.AUTO,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.strategy).toBe(PaginationStrategy.CURSOR);
    });

    it('should use cursor pagination for deep pages (>50)', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        {},
        {
          page: 51,
          limit: 20,
          strategy: PaginationStrategy.AUTO,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.strategy).toBe(PaginationStrategy.CURSOR);
    });

    it('should use offset pagination for shallow pages', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      const result = await service.paginateBattles(
        {},
        {
          page: 10,
          limit: 20,
          strategy: PaginationStrategy.AUTO,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.strategy).toBe(PaginationStrategy.OFFSET);
    });
  });

  describe('sorting', () => {
    it('should apply ASC sorting', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      await service.paginateBattles(
        {},
        {
          page: 1,
          limit: 10,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.ASC,
        },
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('should apply DESC sorting', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);

      await service.paginateBattles(
        {},
        {
          page: 1,
          limit: 10,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.DURATION,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(prismaService.battle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ duration: 'desc' }, { id: 'desc' }],
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
          page: 1,
          limit: 10,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.performance.queryTime).toBeDefined();
      expect(typeof result.performance.queryTime).toBe('number');
    });

    it('should track count time when includeTotal is true', async () => {
      prismaService.battle.findMany.mockResolvedValue(mockBattles);
      prismaService.battle.count.mockResolvedValue(100);

      const result = await service.paginateBattles(
        {},
        {
          page: 1,
          limit: 10,
          includeTotal: true,
          strategy: PaginationStrategy.OFFSET,
          sortField: SortField.CREATED_AT,
          sortOrder: SortOrder.DESC,
        },
      );

      expect(result.performance.countTime).toBeDefined();
      expect(typeof result.performance.countTime).toBe('number');
    });
  });
});
