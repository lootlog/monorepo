import { Test, type TestingModule } from "@nestjs/testing";
import { HealthzController } from "./healthz.controller.js";
import { HealthzService } from "./healthz.service.js";

describe("HealthzController", () => {
  let controller: HealthzController;
  let service: HealthzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthzController],
      providers: [HealthzService],
    }).compile();

    controller = module.get<HealthzController>(HealthzController);
    service = module.get<HealthzService>(HealthzService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("healthCheck", () => {
    it("should return OK", () => {
      const result = controller.healthCheck();
      expect(result).toBe("OK");
    });

    it("should call healthzService.healthCheck", () => {
      const healthCheckSpy = vi.spyOn(service, "healthCheck");
      controller.healthCheck();
      expect(healthCheckSpy).toHaveBeenCalled();
    });
  });
});
