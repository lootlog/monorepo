import { Test, type TestingModule } from "@nestjs/testing";
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthIndicatorService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from "@nestjs/terminus";
import { HealthzController } from "./healthz.controller.js";
import { PrismaService } from "#src/prisma.service";

describe("HealthzController", () => {
  let controller: HealthzController;

  const mockHealthCheckService = {
    check: vi.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: vi.fn(),
  };

  const databaseAll = vi.fn().mockResolvedValue([]);
  const mockPrisma = {
    db: {
      orm: {
        public: {
          MemberActivityStats: {
            select: vi.fn(() => ({
              limit: vi.fn(() => ({ all: databaseAll })),
            })),
          },
        },
      },
    },
  } as unknown as PrismaService;
  const mockHealthIndicatorService = {
    check: vi.fn(() => ({
      up: vi.fn(() => ({ database: { status: "up" } })),
      down: vi.fn(),
    })),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: vi.fn(),
    checkRSS: vi.fn(),
  };

  const mockDiskHealthIndicator = {
    checkStorage: vi.fn(),
  };

  beforeEach(async () => {
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
          provide: HealthIndicatorService,
          useValue: mockHealthIndicatorService,
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
          useValue: mockPrisma,
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
  });
});
