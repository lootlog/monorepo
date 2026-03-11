import { Test, type TestingModule } from "@nestjs/testing";
import { TimersController } from "./timers.controller";
import { TimersService } from "./timers.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

describe("TimersController", () => {
  let controller: TimersController;

  const mockTimersService = {
    getAllTimers: jest.fn(),
    getTimers: jest.fn(),
    resetTimer: jest.fn(),
    deleteTimer: jest.fn(),
    createTimer: jest.fn(),
    createManualTimer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimersController],
      providers: [
        {
          provide: TimersService,
          useValue: mockTimersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TimersController>(TimersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
