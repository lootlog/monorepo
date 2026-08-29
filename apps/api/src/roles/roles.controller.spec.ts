import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { RolesController } from "./roles.controller.js";
import { RolesService } from "./roles.service.js";
import { AuthGuard } from "@lootlog/nest-shared";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";

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

  it("returns guild roles", async () => {
    mockRolesService.getRolesByGuildId.mockResolvedValue([
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Raid Team",
      },
    ]);

    await expect(
      controller.getGuildRoles({ id: "guild-1" } as never),
    ).resolves.toEqual([
      {
        id: "role-1",
        guildId: "guild-1",
        name: "Raid Team",
      },
    ]);
    expect(mockRolesService.getRolesByGuildId).toHaveBeenCalledWith("guild-1");
  });
});
