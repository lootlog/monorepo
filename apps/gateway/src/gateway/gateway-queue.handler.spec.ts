import { GatewayQueueHandler } from "./gateway-queue.handler";
import { RoutingKey } from "./enums/routing-key.enum";

describe("GatewayQueueHandler", () => {
  const mockGatewayService = {
    invalidatePlayerCache: vi.fn(),
    invalidateUserGuildsCache: vi.fn(),
    rebalanceUserSocketRooms: vi.fn(),
  };

  const mockRetryService = {
    handleRetryLogic: vi.fn(),
  };

  let handler: GatewayQueueHandler;

  beforeEach(() => {
    handler = new GatewayQueueHandler(
      mockGatewayService as never,
      mockRetryService as never,
    );

    mockRetryService.handleRetryLogic.mockResolvedValue(true);
    mockGatewayService.invalidatePlayerCache.mockResolvedValue(undefined);
    mockGatewayService.invalidateUserGuildsCache.mockResolvedValue(undefined);
    mockGatewayService.rebalanceUserSocketRooms.mockResolvedValue(undefined);
  });

  const message = {
    properties: {
      headers: {
        "x-retry-count": 1,
      },
    },
  };

  const memberPayload = {
    id: "member-1",
    discordId: "discord-1",
    userId: "user-1",
    guildId: "guild-1",
  };

  const memberRolePayload = {
    ...memberPayload,
    roleId: "role-1",
  };

  it("refreshes caches and rooms when member permissions are updated", async () => {
    await handler.handleUpdateMember(memberPayload as never, message as never);

    expect(mockRetryService.handleRetryLogic).toHaveBeenCalledWith(
      memberPayload,
      message.properties.headers,
      RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
      "member permissions update: discord-1",
    );
    expect(mockGatewayService.invalidatePlayerCache).toHaveBeenCalledWith(
      "member-1",
    );
    expect(mockGatewayService.invalidateUserGuildsCache).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
    expect(mockGatewayService.rebalanceUserSocketRooms).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
  });

  it("refreshes caches and rooms when a role is added", async () => {
    await handler.handleAddMemberRole(
      memberRolePayload as never,
      message as never,
    );

    expect(mockGatewayService.invalidatePlayerCache).toHaveBeenCalledWith(
      "member-1",
    );
    expect(mockGatewayService.invalidateUserGuildsCache).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
    expect(mockGatewayService.rebalanceUserSocketRooms).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
  });

  it("refreshes caches and rooms when a role is removed", async () => {
    await handler.handleDeleteMemberRole(
      memberRolePayload as never,
      message as never,
    );

    expect(mockGatewayService.invalidatePlayerCache).toHaveBeenCalledWith(
      "member-1",
    );
    expect(mockGatewayService.invalidateUserGuildsCache).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
    expect(mockGatewayService.rebalanceUserSocketRooms).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
  });

  it("refreshes caches and rooms when a member is removed", async () => {
    await handler.handleDeleteMember(memberPayload as never, message as never);

    expect(mockGatewayService.invalidatePlayerCache).toHaveBeenCalledWith(
      "member-1",
    );
    expect(mockGatewayService.invalidateUserGuildsCache).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
    expect(mockGatewayService.rebalanceUserSocketRooms).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
    );
  });

  it("short-circuits access refresh when retry service stops processing", async () => {
    mockRetryService.handleRetryLogic.mockResolvedValue(false);

    await handler.handleAddMemberRole(
      memberRolePayload as never,
      message as never,
    );

    expect(mockGatewayService.invalidatePlayerCache).not.toHaveBeenCalled();
    expect(mockGatewayService.invalidateUserGuildsCache).not.toHaveBeenCalled();
    expect(mockGatewayService.rebalanceUserSocketRooms).not.toHaveBeenCalled();
  });
});
