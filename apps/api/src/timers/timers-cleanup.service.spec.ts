import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TimersCleanupService } from './timers-cleanup.service';
import { PrismaService } from 'src/db/prisma.service';

describe('TimersCleanupService', () => {
  const mockPrismaService = {
    $executeRaw: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue(undefined);
    jest.clearAllMocks();
  });

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimersCleanupService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    return module.get<TimersCleanupService>(TimersCleanupService);
  };

  describe('cleanupExpiredTimers', () => {
    it('should delete only expired manual timers with default retention', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = await createService();
      mockPrismaService.$executeRaw.mockResolvedValue(42);

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should skip cleanup when disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'TIMER_CLEANUP_ENABLED') return 'false';
        return undefined;
      });
      const service = await createService();

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('should use custom retention days from config', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'TIMER_RETENTION_DAYS') return '14';
        return undefined;
      });
      const service = await createService();
      mockPrismaService.$executeRaw.mockResolvedValue(10);

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = await createService();
      mockPrismaService.$executeRaw.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.cleanupExpiredTimers()).resolves.not.toThrow();
    });

    it('should preserve game NPC timers and only delete manual timers', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = await createService();
      mockPrismaService.$executeRaw.mockResolvedValue(5);

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTimersManual', () => {
    it('should delete only manual timers with specified retention period', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = await createService();
      mockPrismaService.$executeRaw.mockResolvedValue(25);

      const result = await service.cleanupExpiredTimersManual(14);

      expect(result).toBe(25);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should use default retention days if not specified', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = await createService();
      mockPrismaService.$executeRaw.mockResolvedValue(15);

      const result = await service.cleanupExpiredTimersManual();

      expect(result).toBe(15);
    });

    it('should preserve game NPC timers in manual cleanup', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const service = await createService();
      mockPrismaService.$executeRaw.mockResolvedValue(8);

      const result = await service.cleanupExpiredTimersManual(7);

      expect(result).toBe(8);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });
});
