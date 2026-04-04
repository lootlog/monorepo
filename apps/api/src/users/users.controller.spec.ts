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
});
