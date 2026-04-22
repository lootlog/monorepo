import { Test, type TestingModule } from "@nestjs/testing";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PlayersHandlers } from "./players.handlers";
import { PlayersService } from "./players.service";

describe("PlayersHandlers", () => {
  let handler: PlayersHandlers;

  const playersServiceMock = {
    indexPlayers: vi.fn(),
  };

  const loggerMock = {
    error: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersHandlers,
        {
          provide: PlayersService,
          useValue: playersServiceMock,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: loggerMock,
        },
      ],
    }).compile();

    handler = module.get<PlayersHandlers>(PlayersHandlers);
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("handlePlayersIndex", () => {
    it("should forward valid payload to players service", async () => {
      const payload = [
        {
          id: "123",
          name: "Hero",
          lvl: 40,
          prof: "w",
          icon: "hero.png",
          characterId: 10,
          accountId: 20,
          world: "Berufs",
        },
      ];

      await handler.handlePlayersIndex(payload);

      expect(playersServiceMock.indexPlayers).toHaveBeenCalledWith({
        players: payload,
      });
    });

    it("should log validation errors and skip invalid payload", async () => {
      await handler.handlePlayersIndex([{ id: 123 }]);

      expect(playersServiceMock.indexPlayers).not.toHaveBeenCalled();
      expect(loggerMock.error).toHaveBeenCalledWith(
        "Validation error in players index handler",
        expect.objectContaining({
          error: expect.any(Object),
        }),
      );
    });
  });
});
