import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
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

  const mockPrismaHealthIndicator = {
    pingCheck: vi.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: vi.fn(),
    checkRSS: vi.fn(),
  };

  const mockDiskHealthIndicator = {
    checkStorage: vi.fn(),
  };

  const mockPrismaService = {};

  const mockConfigService = {
    get: vi.fn().mockReturnValue({ url: "http://localhost:3000" }),
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
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
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
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
