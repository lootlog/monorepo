import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission } from "#src/generated/prisma/client";
import { Capability, type AccessPolicy } from "@lootlog/access-policy";
import { PermissionsGuard } from "./permissions.guard.js";

describe("PermissionsGuard", () => {
  it("keeps the policy vocabulary aligned with persisted permissions", () => {
    expect(new Set(Object.values(Capability))).toEqual(
      new Set(Object.values(Permission)),
    );
  });

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  };

  const mockMemberContextService = {
    getMemberContext: vi.fn(),
  };

  let guard: PermissionsGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new PermissionsGuard(
      mockReflector as unknown as Reflector,
      mockMemberContextService as never,
    );
  });

  function createExecutionContext(request: Record<string, unknown>) {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it("allows requests without permissions metadata", () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(createExecutionContext({ params: {} }));

    expect(result).toBe(true);
    expect(mockMemberContextService.getMemberContext).not.toHaveBeenCalled();
  });

  it("rejects requests without user id or guild id", () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      Permission.LOOTLOG_ACCESS,
    ]);

    expect(
      guard.canActivate(
        createExecutionContext({
          userId: undefined,
          discordId: "discord-1",
          params: { guildId: "guild-1" },
        }),
      ),
    ).toBe(false);

    expect(
      guard.canActivate(
        createExecutionContext({
          userId: "user-1",
          discordId: "discord-1",
          params: {},
        }),
      ),
    ).toBe(false);
  });

  it("returns false when member context is missing", async () => {
    mockMemberContextService.getMemberContext.mockResolvedValue(null);

    await expect(
      guard.verifyCapabilities({
        requiredCapabilities: [Permission.LOOTLOG_ACCESS],
        discordId: "discord-1",
        guildId: "guild-1",
        userId: "user-1",
        request: { params: { guildId: "guild-1" } },
      }),
    ).resolves.toBe(false);
  });

  it("returns false when required permission is not present", async () => {
    mockMemberContextService.getMemberContext.mockResolvedValue({
      guild: { id: "guild-1" },
      member: { id: 1 },
      roles: [],
      permissions: [Permission.LOOTLOG_CHAT_READ],
    });

    await expect(
      guard.verifyCapabilities({
        requiredCapabilities: [Permission.LOOTLOG_ACCESS],
        discordId: "discord-1",
        guildId: "guild-1",
        userId: "user-1",
        request: { params: { guildId: "guild-1" } },
      }),
    ).resolves.toBe(false);
  });

  it("stores guild member context on the request when access is granted", async () => {
    const request: {
      accessPolicy?: AccessPolicy;
      params: { guildId: string };
    } = { params: { guildId: "guild-1" } };
    const context = {
      guild: { id: "guild-1" },
      member: { id: 1 },
      roles: [{ id: "role-1" }],
      permissions: [Permission.LOOTLOG_ACCESS],
    };

    mockMemberContextService.getMemberContext.mockResolvedValue(context);

    await expect(
      guard.verifyCapabilities({
        requiredCapabilities: [Permission.LOOTLOG_ACCESS],
        discordId: "discord-1",
        guildId: "guild-1",
        userId: "user-1",
        request,
      }),
    ).resolves.toBe(true);

    expect(request).toMatchObject({
      guild: context.guild,
      member: context.member,
      roles: context.roles,
    });
    expect(request.accessPolicy.allows(Permission.LOOTLOG_ACCESS)).toBe(true);
  });
});
