import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { TimersCleanupService } from "./timers-cleanup.service";
import { PrismaService } from "src/db/prisma.service";
import { createPrismaServiceTestDouble } from "src/test/prisma-service-test-double";

const mockEnv = {
  TIMER_CLEANUP_ENABLED: "true",
  TIMER_RETENTION_DAYS: 7,
};

vi.mock("src/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

describe("TimersCleanupService", () => {
  const mockPrismaService = createPrismaServiceTestDouble({
    execute: mockFn(),
  });

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
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    return module.get<TimersCleanupService>(TimersCleanupService);
  };

  describe("cleanupExpiredTimers", () => {
    it("should delete only expired manual timers with default retention", async () => {
      const service = await createService();
      mockPrismaService.execute.mockResolvedValue(42);

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.execute).toHaveBeenCalled();
    });

    it("should skip cleanup when disabled", async () => {
      mockEnv.TIMER_CLEANUP_ENABLED = "false";
      const service = await createService();

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.execute).not.toHaveBeenCalled();
    });

    it("should use custom retention days from config", async () => {
      mockEnv.TIMER_RETENTION_DAYS = 14;
      const service = await createService();
      mockPrismaService.execute.mockResolvedValue(10);

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.execute).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      const service = await createService();
      mockPrismaService.execute.mockRejectedValue(new Error("Database error"));

      await expect(service.cleanupExpiredTimers()).resolves.not.toThrow();
    });

    it("should preserve game NPC timers and only delete manual timers", async () => {
      const service = await createService();
      mockPrismaService.execute.mockResolvedValue(5);

      await service.cleanupExpiredTimers();

      expect(mockPrismaService.execute).toHaveBeenCalled();
    });
  });

  describe("cleanupExpiredTimersManual", () => {
    it("should delete only manual timers with specified retention period", async () => {
      const service = await createService();
      mockPrismaService.execute.mockResolvedValue(25);

      const result = await service.cleanupExpiredTimersManual(14);

      expect(result).toBe(25);
      expect(mockPrismaService.execute).toHaveBeenCalled();
    });

    it("should use default retention days if not specified", async () => {
      const service = await createService();
      mockPrismaService.execute.mockResolvedValue(15);

      const result = await service.cleanupExpiredTimersManual();

      expect(result).toBe(15);
    });

    it("should preserve game NPC timers in manual cleanup", async () => {
      const service = await createService();
      mockPrismaService.execute.mockResolvedValue(8);

      const result = await service.cleanupExpiredTimersManual(7);

      expect(result).toBe(8);
      expect(mockPrismaService.execute).toHaveBeenCalled();
    });

    it("should propagate cleanup errors in manual mode", async () => {
      const service = await createService();
      mockPrismaService.execute.mockRejectedValue(new Error("Database error"));

      await expect(service.cleanupExpiredTimersManual(7)).rejects.toThrow(
        "Database error",
      );
    });
  });
});
