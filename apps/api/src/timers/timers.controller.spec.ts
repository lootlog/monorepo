import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import type { CreateTimerFromGameClientDto } from "src/timers/dto/create-timer-from-game-client.dto";
import { TimersController } from "./timers.controller";
import { TimersService } from "./timers.service";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

describe("TimersController", () => {
  let controller: TimersController;

  const mockTimersService = {
    getAllTimers: mockFn(),
    getTimers: mockFn(),
    resetTimer: mockFn(),
    deleteTimer: mockFn(),
    createAutoTimer: mockFn(),
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

  it("delegates automatic timer creation to the auto service method", () => {
    const payload = {
      respBaseSeconds: 60,
      world: "tarhuna",
      characterId: "character-1",
      accountId: "account-1",
      npc: {
        id: 123,
        name: "Test Boss",
        location: "Kwieciste Przejscie",
        lvl: 100,
        prof: "w",
        wt: 50,
        hpp: 100,
        icon: "boss.gif",
        type: 1,
      },
    } satisfies CreateTimerFromGameClientDto;

    controller.createAutoTimer(payload, "discord-1", "user-1");

    expect(mockTimersService.createAutoTimer).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
      payload,
    );
  });
});
