import { Test, type TestingModule } from "@nestjs/testing";
import { HealthzController } from "./healthz.controller.js";
import { HealthzService } from "./healthz.service.js";

describe("HealthzController", () => {
  let controller: HealthzController;

  const healthzServiceMock = {
    healthCheck: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthzController],
      providers: [
        {
          provide: HealthzService,
          useValue: healthzServiceMock,
        },
      ],
    }).compile();

    controller = module.get<HealthzController>(HealthzController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("healthCheck", () => {
    it("should delegate to healthz service", () => {
      healthzServiceMock.healthCheck.mockReturnValue("Healthy");

      expect(controller.healthCheck()).toBe("Healthy");
      expect(healthzServiceMock.healthCheck).toHaveBeenCalledTimes(1);
    });
  });
});
