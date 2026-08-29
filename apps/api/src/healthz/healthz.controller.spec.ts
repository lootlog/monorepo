import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { HealthzController } from "./healthz.controller.js";
import { HealthzService } from "./healthz.service.js";

describe("HealthzController", () => {
  let controller: HealthzController;

  const mockHealthzService = {
    healthCheck: mockFn(),
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
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
