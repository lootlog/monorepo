import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

describe("UserController", () => {
  let controller: UsersController;

  const mockUsersService = {
    getUserPreferences: mockFn(),
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
});
