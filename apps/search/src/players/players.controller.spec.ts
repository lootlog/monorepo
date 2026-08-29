import { Test, type TestingModule } from "@nestjs/testing";
import { PlayersController } from "./players.controller.js";
import { PlayersService } from "./players.service.js";

describe("PlayersController", () => {
  let controller: PlayersController;

  const playersServiceMock = {
    getPlayers: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        {
          provide: PlayersService,
          useValue: playersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPlayers", () => {
    it("should delegate query to players service", async () => {
      const query = {
        limit: 10,
        search: "hero",
        world: "Berufs",
      };

      const response = [{ id: "1", name: "Hero" }];
      playersServiceMock.getPlayers.mockResolvedValue(response);

      await expect(controller.getPlayers(query)).resolves.toEqual(response);
      expect(playersServiceMock.getPlayers).toHaveBeenCalledWith(query);
    });
  });
});
