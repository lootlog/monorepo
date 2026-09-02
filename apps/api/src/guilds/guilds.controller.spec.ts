import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { GuildsController } from "./guilds.controller.js";
import { GuildsService } from "./guilds.service.js";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";

describe("GuildsController", () => {
  let controller: GuildsController;

  const mockGuildsService = {
    getUserGuilds: mockFn(),
    getUserGuildsWithPermissions: mockFn(),
    getManageableUserGuilds: mockFn(),
    getGuildById: mockFn(),
    updateGuildConfig: mockFn(),
    getWorldsByGuildId: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuildsController],
      providers: [
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GuildsController>(GuildsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("delegates deprecated /guilds/@me requests to the guild list service", async () => {
    mockGuildsService.getUserGuilds.mockResolvedValue([]);

    await controller.getUserGuilds(
      "discord-user-current",
      "auth-user-current",
      "game",
    );

    expect(mockGuildsService.getUserGuilds).toHaveBeenCalledWith(
      "discord-user-current",
      "auth-user-current",
      "game",
    );
  });

  it("delegates deprecated /guilds/@me/permissions requests to the permissions service", async () => {
    mockGuildsService.getUserGuildsWithPermissions.mockResolvedValue([]);

    await controller.getUserGuildsWithPermissions(
      "discord-user-current",
      "auth-user-current",
    );

    expect(mockGuildsService.getUserGuildsWithPermissions).toHaveBeenCalledWith(
      "discord-user-current",
      "auth-user-current",
    );
  });
});
