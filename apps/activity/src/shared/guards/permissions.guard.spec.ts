import {
  type ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_CAPABILITIES_KEY } from "@lootlog/nest-shared";
import { Permission } from "@lootlog/types";
import { PermissionsService } from "#src/permissions/permissions.service";
import { PermissionsGuard } from "./permissions.guard.js";

class TestPermissionsController {
  @SetMetadata(REQUIRED_CAPABILITIES_KEY, [Permission.ADMIN])
  protectedRoute() {}
}

describe("PermissionsGuard", () => {
  let guard: PermissionsGuard;

  const mockPermissionsService = {
    resolveGuildId: vi.fn(),
    getUserGuildPermissions: vi.fn(),
  };

  const createExecutionContext = (
    request: Record<string, unknown>,
  ): ExecutionContext =>
    ({
      getHandler: () => TestPermissionsController.prototype.protectedRoute,
      getClass: () => TestPermissionsController,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new PermissionsGuard(
      new Reflector(),
      mockPermissionsService as unknown as PermissionsService,
    );
  });

  it("should allow access after resolving vanity URL to canonical guild id", async () => {
    const request = {
      userId: "user-1",
      discordId: "discord-1",
      params: {
        guildId: "guild-one",
      },
    };

    mockPermissionsService.resolveGuildId.mockResolvedValue("guild-1");
    mockPermissionsService.getUserGuildPermissions.mockResolvedValue([
      Permission.ADMIN,
    ]);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(mockPermissionsService.resolveGuildId).toHaveBeenCalledWith(
      "guild-one",
    );
    expect(mockPermissionsService.getUserGuildPermissions).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
      "guild-1",
    );
    expect(request.params.guildId).toBe("guild-1");
  });

  it("should reject access when guild identifier cannot be resolved", async () => {
    const request = {
      userId: "user-1",
      discordId: "discord-1",
      params: {
        guildId: "missing-guild",
      },
    };

    mockPermissionsService.resolveGuildId.mockResolvedValue(null);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toThrow(ForbiddenException);
    expect(
      mockPermissionsService.getUserGuildPermissions,
    ).not.toHaveBeenCalled();
  });

  it("should reject access when user lacks required permissions", async () => {
    const request = {
      userId: "user-1",
      discordId: "discord-1",
      params: {
        guildId: "guild-one",
      },
    };

    mockPermissionsService.resolveGuildId.mockResolvedValue("guild-1");
    mockPermissionsService.getUserGuildPermissions.mockResolvedValue([
      Permission.LOOTLOG_ACCESS,
    ]);

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toThrow(ForbiddenException);
  });
});
