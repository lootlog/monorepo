import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { TimersController } from "./timers.controller";
import { TimersService } from "./timers.service";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

describe("TimersController", () => {
  let controller: TimersController;

  const mockTimersService = {
    getAllTimers: mockFn(),
    getTimers: mockFn(),
    resetTimer: mockFn(),
    deleteTimer: mockFn(),
    createTimer: mockFn(),
    createManualTimer: mockFn(),
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
