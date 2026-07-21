import { Test, type TestingModule } from "@nestjs/testing";
import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { mockFn } from "src/test/mock-fn";
import { UserLootlogConfigController } from "./user-lootlog-config.controller";
import { UserLootlogConfigService } from "./user-lootlog-config.service";

describe("UserLootlogConfigController", () => {
  let controller: UserLootlogConfigController;

  const mockUserLootlogConfigService = {
    createOrUpdateLootlogCharacterConfig: mockFn(),
    getLootlogAccountConfig: mockFn(),
    getPlayersCatchingGuilds: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserLootlogConfigController],
      providers: [
        {
          provide: UserLootlogConfigService,
          useValue: mockUserLootlogConfigService,
        },
      ],
    }).compile();

    controller = module.get<UserLootlogConfigController>(
      UserLootlogConfigController,
    );

    vi.clearAllMocks();
  });

  describe("getPlayersCatchingGuilds", () => {
    it("uses 200 status for the batch read endpoint", () => {
      expect(
        Reflect.getMetadata(
          HTTP_CODE_METADATA,
          controller.getPlayersCatchingGuilds,
        ),
      ).toBe(200);
    });

    it("delegates batch request to service using authenticated user", async () => {
      const payload = {
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "617",
          },
          {
            userId: "other-discord",
            accountId: "9822301",
            characterId: "30016",
          },
        ],
      };
      mockUserLootlogConfigService.getPlayersCatchingGuilds.mockResolvedValue({
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "617",
            guilds: [{ id: "guild1", name: "Alpha" }],
          },
          {
            userId: "other-discord",
            accountId: "9822301",
            characterId: "30016",
            guilds: [],
          },
        ],
      });

      const result = await controller.getPlayersCatchingGuilds(
        "viewer-discord",
        payload,
      );

      expect(
        mockUserLootlogConfigService.getPlayersCatchingGuilds,
      ).toHaveBeenCalledWith("viewer-discord", payload);
      expect(result).toEqual({
        players: [
          {
            userId: "player-discord",
            accountId: "9822301",
            characterId: "617",
            guilds: [{ id: "guild1", name: "Alpha" }],
          },
          {
            userId: "other-discord",
            accountId: "9822301",
            characterId: "30016",
            guilds: [],
          },
        ],
      });
    });
  });
});
