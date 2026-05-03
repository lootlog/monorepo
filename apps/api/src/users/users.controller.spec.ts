import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

describe("UserController", () => {
  let controller: UsersController;

  const mockUsersService = {
    getUserPreferences: mockFn(),
    getCurrentUserGuilds: mockFn(),
    getCurrentUserAccessibleGuilds: mockFn(),
    updateUserPreferences: mockFn(),
    getUserGameAccountPreferences: mockFn(),
    updateUserGameAccountPreferences: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("delegates account preference reads to the service", async () => {
    mockUsersService.getUserGameAccountPreferences.mockResolvedValue({
      accountId: "12345",
      detector: {},
      hasStoredDetector: false,
      hasStoredNotifications: false,
      notifications: {},
      hasStoredPreferences: false,
    });

    await controller.getUserGameAccountPreferences(
      "auth-user-current",
      "12345",
    );

    expect(mockUsersService.getUserGameAccountPreferences).toHaveBeenCalledWith(
      "auth-user-current",
      "12345",
    );
  });

  it("delegates current-user guild reads to the service", async () => {
    mockUsersService.getCurrentUserGuilds.mockResolvedValue([]);

    await controller.getCurrentUserGuilds(
      "discord-user-current",
      "auth-user-current",
    );

    expect(mockUsersService.getCurrentUserGuilds).toHaveBeenCalledWith(
      "discord-user-current",
      "auth-user-current",
    );
  });

  it("delegates accessible current-user guild reads to the service", async () => {
    mockUsersService.getCurrentUserAccessibleGuilds.mockResolvedValue([
      {
        id: "guild-1",
        name: "Alpha",
        icon: null,
        vanityUrl: null,
        ownerId: "owner-1",
        publicStatsCardEnabled: false,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ]);

    const result = await controller.getCurrentUserAccessibleGuilds(
      "discord-user-current",
      "auth-user-current",
    );

    expect(
      mockUsersService.getCurrentUserAccessibleGuilds,
    ).toHaveBeenCalledWith("discord-user-current", "auth-user-current");
    expect(result).toEqual([
      {
        id: "guild-1",
        name: "Alpha",
        icon: null,
        vanityUrl: null,
        ownerId: "owner-1",
        publicStatsCardEnabled: false,
        hasLootlogAccess: true,
        isAccessDataStale: false,
      },
    ]);
  });
});
