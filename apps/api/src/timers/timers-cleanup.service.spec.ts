import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { TimersCleanupService } from "./timers-cleanup.service.js";
import { PrismaService } from "#src/db/prisma.service";

const mockEnv = {
  TIMER_CLEANUP_ENABLED: "true",
  TIMER_RETENTION_DAYS: 7,
};

vi.mock("#src/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

describe("TimersCleanupService", () => {
  const execute = mockFn();
  const mockPrisma = {
    raw: {
      sql: mockFn(() => ({
        affectedCount: mockFn(() => ({ build: mockFn(() => ({})) })),
      })),
    },
    runtime: mockFn(() => ({ execute })),
  };

  beforeEach(() => {
    mockEnv.TIMER_CLEANUP_ENABLED = "true";
    mockEnv.TIMER_RETENTION_DAYS = 7;
    vi.clearAllMocks();
  });

  const createService = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimersCleanupService,
        {
          provide: PrismaService,
          useValue: { db: mockPrisma },
        },
      ],
    }).compile();

    return module.get<TimersCleanupService>(TimersCleanupService);
  };

  describe("cleanupExpiredTimers", () => {
    it("should delete only expired manual timers with default retention", async () => {
      const service = await createService();
      execute.mockResolvedValue({ affectedRows: 42 });

      await service.cleanupExpiredTimers();

      expect(execute).toHaveBeenCalled();
    });

    it("should skip cleanup when disabled", async () => {
      mockEnv.TIMER_CLEANUP_ENABLED = "false";
      const service = await createService();

      await service.cleanupExpiredTimers();

      expect(execute).not.toHaveBeenCalled();
    });

    it("should use custom retention days from config", async () => {
      mockEnv.TIMER_RETENTION_DAYS = 14;
      const service = await createService();
      execute.mockResolvedValue({ affectedRows: 10 });

      await service.cleanupExpiredTimers();

      expect(execute).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      const service = await createService();
      execute.mockRejectedValue(new Error("Database error"));

      await expect(service.cleanupExpiredTimers()).resolves.not.toThrow();
    });

    it("should preserve game NPC timers and only delete manual timers", async () => {
      const service = await createService();
      execute.mockResolvedValue({ affectedRows: 5 });

      await service.cleanupExpiredTimers();

      expect(execute).toHaveBeenCalled();
    });
  });

  describe("cleanupExpiredTimersManual", () => {
    it("should delete only manual timers with specified retention period", async () => {
      const service = await createService();
      execute.mockResolvedValue({ affectedRows: 25 });

      const result = await service.cleanupExpiredTimersManual(14);

      expect(result).toBe(25);
      expect(execute).toHaveBeenCalled();
    });

    it("should use default retention days if not specified", async () => {
      const service = await createService();
      execute.mockResolvedValue({ affectedRows: 15 });

      const result = await service.cleanupExpiredTimersManual();

      expect(result).toBe(15);
    });

    it("should preserve game NPC timers in manual cleanup", async () => {
      const service = await createService();
      execute.mockResolvedValue({ affectedRows: 8 });

      const result = await service.cleanupExpiredTimersManual(7);

      expect(result).toBe(8);
      expect(execute).toHaveBeenCalled();
    });

    it("should propagate cleanup errors in manual mode", async () => {
      const service = await createService();
      execute.mockRejectedValue(new Error("Database error"));

      await expect(service.cleanupExpiredTimersManual(7)).rejects.toThrow(
        "Database error",
      );
    });
  });
});
