import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

describe("RolesController", () => {
  let controller: RolesController;

  const mockRolesService = {
    getRolesByGuildId: mockFn(),
    updateRolePermissions: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RolesController>(RolesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
