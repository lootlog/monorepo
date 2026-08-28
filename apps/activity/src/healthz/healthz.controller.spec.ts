import { Test, type TestingModule } from "@nestjs/testing";
import {
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from "@nestjs/terminus";
import { HealthzController } from "./healthz.controller";
import { PrismaService } from "src/shared/db/prisma.service";

describe("HealthzController", () => {
  let controller: HealthzController;

  const mockHealthCheckService = {
    check: vi.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: vi.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: vi.fn(),
    checkRSS: vi.fn(),
  };

  const mockDiskHealthIndicator = {
    checkStorage: vi.fn(),
  };

  const mockPrismaService = {
    ping: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthzController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthzController>(HealthzController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("check", () => {
    it("should execute health checks", async () => {
      mockHealthCheckService.check.mockResolvedValue({
        status: "ok",
        info: {},
        error: {},
        details: {},
      });

      await controller.check();

      expect(mockHealthCheckService.check).toHaveBeenCalled();
    });

    it("checks the database through PrismaService", async () => {
      mockPrismaService.ping.mockResolvedValue(undefined);
      mockHealthCheckService.check.mockImplementation(async (checks) =>
        checks[0](),
      );

      await expect(controller.check()).resolves.toEqual({
        database: { status: "up" },
      });

      expect(mockPrismaService.ping).toHaveBeenCalledOnce();
    });
  });
});
