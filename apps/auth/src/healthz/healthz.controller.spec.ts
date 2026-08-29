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

  it("returns the health payload", () => {
    expect(controller.healthCheck()).toEqual({ status: "ok" });
  });

  it("delegates to HealthzService", () => {
    const healthCheckSpy = vi.spyOn(service, "healthCheck");

    controller.healthCheck();

    expect(healthCheckSpy).toHaveBeenCalledTimes(1);
  });
});
