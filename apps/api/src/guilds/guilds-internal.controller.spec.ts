import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { GuildsInternalController } from "./guilds-internal.controller";
import { GuildsService } from "./guilds.service";

describe("GuildsInternalController", () => {
  let controller: GuildsInternalController;
  let guildsService: GuildsService;

  const mockGuildsService = {
    getGuildById: mockFn(),
    getUserGuildsWithPermissions: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuildsInternalController],
      providers: [
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
      ],
    }).compile();

    controller = module.get<GuildsInternalController>(GuildsInternalController);
    guildsService = module.get<GuildsService>(GuildsService);

    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getGuildByIdOrVanityUrl", () => {
    it("should delegate guild resolution to GuildsService", async () => {
      const guild = {
        id: "guild-1",
        name: "Guild One",
        icon: null,
        vanityUrl: "guild-one",
        ownerId: "owner-1",
      };

      mockGuildsService.getGuildById.mockResolvedValue(guild);

      await expect(
        controller.getGuildByIdOrVanityUrl("guild-one"),
      ).resolves.toEqual(guild);
      expect(guildsService.getGuildById).toHaveBeenCalledWith("guild-one");
    });
  });

  describe("getUserPermissions", () => {
    it("should return an empty array when required query params are missing", async () => {
      await expect(controller.getUserPermissions("", "")).resolves.toEqual([]);
      expect(guildsService.getUserGuildsWithPermissions).not.toHaveBeenCalled();
    });

    it("should delegate user permissions lookup to GuildsService", async () => {
      const permissions = [
        {
          guild: {
            id: "guild-1",
            ownerId: "owner-1",
          },
          roles: [],
        },
      ];

      mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue(
        permissions,
      );

      await expect(
        controller.getUserPermissions("discord-1", "user-1"),
      ).resolves.toEqual(permissions);
      expect(guildsService.getUserGuildsWithPermissions).toHaveBeenCalledWith(
        "discord-1",
        "user-1",
        { devPermissionOverride: undefined },
      );
    });
  });
});
