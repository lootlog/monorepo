import { GatewayQueueHandler } from "./gateway-queue.handler";
import { RoutingKey } from "./enums/routing-key.enum";

describe("GatewayQueueHandler", () => {
  const mockGatewayService = {
    invalidatePlayerCache: vi.fn(),
    invalidateUserGuildsCache: vi.fn(),
    rebalanceUserSocketRooms: vi.fn(),
    handleGuildsLootCreate: vi.fn(),
    handleGuildsLootShareUpdate: vi.fn(),
    handleGuildsReservationChangedV2: vi.fn(),
    handlePartyReadyRoomUpdate: vi.fn(),
  };

  const mockRetryService = {
    handleRetryLogic: vi.fn(),
    getRetryCount: vi.fn(),
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
    mockGatewayService.handleGuildsLootCreate.mockResolvedValue(undefined);
    mockGatewayService.handleGuildsLootShareUpdate.mockResolvedValue(undefined);
    mockGatewayService.handleGuildsReservationChangedV2.mockResolvedValue(
      undefined,
    );
    mockGatewayService.handlePartyReadyRoomUpdate.mockResolvedValue(undefined);
    mockRetryService.getRetryCount.mockReturnValue(1);
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

  it("routes personalized Ready Room envelopes through retry logic", async () => {
    const payload = {
      recipientDiscordId: "participant",
      eligibleGuildIds: ["guild-1"],
      update: {
        schemaVersion: 3,
        type: "UPSERT",
        projection: {
          schemaVersion: 3,
          notificationId: "room-1",
          organizerDiscordId: "organizer",
          guildIds: ["guild-1"],
          status: "ACTIVE",
          revision: 2,
          viewer: "PARTICIPANT",
          participants: {
            "participant-1": { discordId: "participant" },
          },
        },
      },
    };

    await handler.handlePartyReadyRoomUpdate(payload, message as never);

    expect(mockRetryService.handleRetryLogic).toHaveBeenCalledWith(
      expect.objectContaining({ recipientDiscordId: "participant" }),
      message.properties.headers,
      RoutingKey.USERS_PARTY_READY_ROOM_UPDATED_DLQ,
      "party ready room: room-1:participant",
    );
    expect(mockGatewayService.handlePartyReadyRoomUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ recipientDiscordId: "participant" }),
    );
  });

  it("routes loot create events through retry logic", async () => {
    const payload = { guildId: "guild-1", lootId: 123 };

    await handler.handleGuildsLootCreate(payload, message as never);

    expect(mockRetryService.handleRetryLogic).toHaveBeenCalledWith(
      payload,
      message.properties.headers,
      RoutingKey.GUILDS_LOOTS_CREATE_DLQ,
      "loot create: guild-1:123",
    );
    expect(mockGatewayService.handleGuildsLootCreate).toHaveBeenCalledWith(
      payload,
    );
  });

  it("routes loot share update events through retry logic", async () => {
    const payload = {
      guildId: "guild-1",
      lootId: 123,
      lootShare: { player: ["item"] },
    };

    await handler.handleGuildsLootShareUpdate(payload, message as never);

    expect(mockRetryService.handleRetryLogic).toHaveBeenCalledWith(
      payload,
      message.properties.headers,
      RoutingKey.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
      "loot share update: guild-1:123",
    );
    expect(mockGatewayService.handleGuildsLootShareUpdate).toHaveBeenCalledWith(
      payload,
    );
  });

  it("lets retry handling bound malformed reservation v2 messages before parsing", async () => {
    const malformedPayload = { version: 2, sourceGuildId: "guild-1" };
    mockRetryService.handleRetryLogic.mockResolvedValue(false);

    await expect(
      handler.handleGuildsReservationChangedV2(
        malformedPayload,
        message as never,
      ),
    ).resolves.toBeUndefined();

    expect(mockRetryService.handleRetryLogic).toHaveBeenCalledWith(
      malformedPayload,
      message.properties.headers,
      RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
      "invalid reservation v2 change",
    );
    expect(
      mockGatewayService.handleGuildsReservationChangedV2,
    ).not.toHaveBeenCalled();
  });

  it("logs loot create messages sent to DLQ", () => {
    const payload = { guildId: "guild-1", lootId: 123 };
    const loggerSpy = vi
      .spyOn(handler["logger"], "error")
      .mockImplementation(() => undefined);

    handler.handleLootCreateDLQ(payload, message as never);

    expect(mockRetryService.getRetryCount).toHaveBeenCalledWith(
      message.properties.headers,
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      "Message sent to DLQ - Loot Create:",
      {
        data: payload,
        retryCount: 1,
        headers: message.properties.headers,
      },
    );
  });

  it("logs loot share update messages sent to DLQ", () => {
    const payload = {
      guildId: "guild-1",
      lootId: 123,
      lootShare: { player: ["item"] },
    };
    const loggerSpy = vi
      .spyOn(handler["logger"], "error")
      .mockImplementation(() => undefined);

    handler.handleLootShareUpdateDLQ(payload, message as never);

    expect(mockRetryService.getRetryCount).toHaveBeenCalledWith(
      message.properties.headers,
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      "Message sent to DLQ - Loot Share Update:",
      {
        data: payload,
        retryCount: 1,
        headers: message.properties.headers,
      },
    );
  });

  it("logs DLQ messages without headers using an empty headers object", () => {
    const payload = { guildId: "guild-1", lootId: 123 };
    const messageWithoutHeaders = {
      properties: {},
    };
    const loggerSpy = vi
      .spyOn(handler["logger"], "error")
      .mockImplementation(() => undefined);

    handler.handleLootCreateDLQ(payload, messageWithoutHeaders as never);

    expect(mockRetryService.getRetryCount).toHaveBeenCalledWith({});
    expect(loggerSpy).toHaveBeenCalledWith(
      "Message sent to DLQ - Loot Create:",
      {
        data: payload,
        retryCount: 1,
        headers: {},
      },
    );
  });

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
