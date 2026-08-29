import { Test, type TestingModule } from "@nestjs/testing";
import { HealthzController } from "./healthz.controller.js";
import { HealthzService } from "./healthz.service.js";

describe("HealthzController", () => {
  let controller: HealthzController;
  let service: HealthzService;

  const mockHealthzService = {
    healthCheck: vi.fn().mockReturnValue({ status: "ok" }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthzController],
      providers: [
        {
          provide: HealthzService,
          useValue: mockHealthzService,
        },
      ],
    }).compile();

    controller = module.get<HealthzController>(HealthzController);
    service = module.get<HealthzService>(HealthzService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return health check status", () => {
    const result = controller.healthCheck();

    expect(service.healthCheck).toHaveBeenCalled();
    expect(result).toEqual({ status: "ok" });
  });
});
