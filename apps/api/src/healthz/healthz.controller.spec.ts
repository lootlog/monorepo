import { Test, type TestingModule } from "@nestjs/testing";
import { HealthzController } from "./healthz.controller";
import { HealthzService } from "./healthz.service";

describe("HealthzController", () => {
  let controller: HealthzController;

  const mockHealthzService = {
    healthCheck: jest.fn(),
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
