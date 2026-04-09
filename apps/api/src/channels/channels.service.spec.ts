import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { mockFn } from "src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import { ChannelsService } from "./channels.service";
import { DiscordBotClientService } from "src/discord-bot-client/discord-bot-client.service";

vi.mock("src/config/discord-bot.config", () => ({
  discordBotConfig: { channelSnapshotStaleSeconds: 300 },
}));

describe("ChannelsService", () => {
  let service: ChannelsService;

  const mockTx = {
    discordGuildChannelSnapshot: {
      upsert: mockFn(),
      deleteMany: mockFn(),
    },
    discordGuildSyncState: {
      upsert: mockFn(),
    },
    notificationTarget: {
      updateMany: mockFn(),
    },
  };

  const mockPrisma = {
    $transaction: mockFn(),
    guild: {
      findUnique: mockFn(),
    },
    discordGuildChannelSnapshot: {
      findMany: mockFn(),
    },
    discordGuildSyncState: {
      findUnique: mockFn(),
      upsert: mockFn(),
    },
  };

  const mockDiscordBotClient = {
    refreshGuildChannels: mockFn(),
  };

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  const mockLogger = {
    log: mockFn(),
    warn: mockFn(),
  };

  const baseSyncState = {
    guildId: "guild-1",
    status: DiscordGuildSyncStatus.SYNCED,
    hasRequiredPermissions: true,
    requiredPermissions: ["ViewChannel", "SendMessages"],
    grantedPermissions: ["ViewChannel", "SendMessages"],
    missingPermissions: [],
    channelCount: 1,
    selectableChannelCount: 1,
    lastAttemptAt: "2026-03-31T12:00:00.000Z",
    lastSuccessAt: "2026-03-31T12:00:00.000Z",
    lastError: null,
    updatedAt: "2026-03-31T12:00:00.000Z",
  };

  const baseChannel = {
    guildId: "guild-1",
    channelId: "channel-1",
    name: "alerts",
    channelType: "GuildText",
    parentId: null,
    position: 1,
    active: true,
    canView: true,
    canSend: true,
    hasRequiredPermissions: true,
    requiredPermissions: ["ViewChannel", "SendMessages"],
    grantedPermissions: ["ViewChannel", "SendMessages"],
    missingPermissions: [],
    lastSyncedAt: "2026-03-31T12:00:00.000Z",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockTx) => Promise<unknown>) => callback(mockTx),
    );
    mockPrisma.guild.findUnique.mockResolvedValue({ id: "guild-1" });
    mockTx.discordGuildChannelSnapshot.upsert.mockResolvedValue(undefined);
    mockTx.discordGuildChannelSnapshot.deleteMany.mockResolvedValue({
      count: 0,
    });
    mockTx.discordGuildSyncState.upsert.mockResolvedValue(undefined);
    mockTx.notificationTarget.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.discordGuildSyncState.upsert.mockResolvedValue(undefined);
    mockAmqpConnection.publish.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: DiscordBotClientService,
          useValue: mockDiscordBotClient,
        },
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  it("refreshes stale channel snapshots on demand", async () => {
    mockPrisma.discordGuildChannelSnapshot.findMany
      .mockResolvedValueOnce([baseChannel])
      .mockResolvedValueOnce([{ channelId: "channel-1" }])
      .mockResolvedValueOnce([baseChannel]);
    mockPrisma.discordGuildSyncState.findUnique
      .mockResolvedValueOnce({
        ...baseSyncState,
        updatedAt: new Date(baseSyncState.updatedAt),
        status: DiscordGuildSyncStatus.STALE,
      })
      .mockResolvedValueOnce({
        ...baseSyncState,
        updatedAt: new Date(baseSyncState.updatedAt),
        lastAttemptAt: new Date(baseSyncState.lastAttemptAt),
        lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
      });
    mockDiscordBotClient.refreshGuildChannels.mockResolvedValue({
      channels: [baseChannel],
      syncState: baseSyncState,
    });

    const result = await service.getGuildDiscordChannels("guild-1", {
      refreshIfStale: true,
    });

    expect(mockDiscordBotClient.refreshGuildChannels).toHaveBeenCalledWith(
      "guild-1",
    );
    expect(result).toEqual({
      channels: [baseChannel],
      syncState: expect.objectContaining({
        guildId: "guild-1",
        status: DiscordGuildSyncStatus.SYNCED,
      }),
    });
  });

  it("keeps the cached snapshot and records FAILED when refresh errors transiently", async () => {
    mockPrisma.discordGuildChannelSnapshot.findMany.mockResolvedValueOnce([
      baseChannel,
    ]);
    mockPrisma.discordGuildSyncState.findUnique.mockResolvedValueOnce({
      ...baseSyncState,
      updatedAt: new Date(baseSyncState.updatedAt),
      lastAttemptAt: new Date(baseSyncState.lastAttemptAt),
      lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
      status: DiscordGuildSyncStatus.STALE,
    });
    mockDiscordBotClient.refreshGuildChannels.mockRejectedValue(
      new Error("Discord timeout"),
    );

    const result = await service.getGuildDiscordChannels("guild-1", {
      refreshIfStale: true,
    });

    expect(result).toEqual({
      channels: [baseChannel],
      syncState: expect.objectContaining({
        guildId: "guild-1",
        status: DiscordGuildSyncStatus.FAILED,
        lastError: "Discord timeout",
        lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
      }),
    });
    expect(mockPrisma.discordGuildSyncState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guildId: "guild-1" },
        update: expect.objectContaining({
          status: DiscordGuildSyncStatus.FAILED,
          lastError: "Discord timeout",
        }),
      }),
    );
  });

  it("removes missing channels during full reconcile and emits delete events", async () => {
    mockDiscordBotClient.refreshGuildChannels.mockResolvedValue({
      channels: [baseChannel],
      syncState: baseSyncState,
    });
    mockPrisma.discordGuildChannelSnapshot.findMany
      .mockResolvedValueOnce([
        { channelId: "channel-1" },
        { channelId: "channel-removed" },
      ])
      .mockResolvedValueOnce([baseChannel]);
    mockPrisma.discordGuildSyncState.findUnique.mockResolvedValueOnce({
      ...baseSyncState,
      updatedAt: new Date(baseSyncState.updatedAt),
      lastAttemptAt: new Date(baseSyncState.lastAttemptAt),
      lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
    });

    await service.refreshGuildDiscordChannels("guild-1");

    expect(mockTx.discordGuildChannelSnapshot.deleteMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        channelId: {
          in: ["channel-removed"],
        },
      },
    });
    expect(mockTx.notificationTarget.updateMany).toHaveBeenCalledWith({
      where: {
        ownerType: "GUILD",
        ownerId: "guild-1",
        provider: "DISCORD",
        targetType: "CHANNEL",
        externalId: "channel-1",
      },
      data: {
        canSend: true,
        lastSyncedAt: new Date(baseChannel.lastSyncedAt),
        metadata: {
          channelType: "GuildText",
          requiredPermissions: ["ViewChannel", "SendMessages"],
          grantedPermissions: ["ViewChannel", "SendMessages"],
          missingPermissions: [],
          hasRequiredPermissions: true,
        },
      },
    });
    expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      {
        guildId: "guild-1",
        channelId: "channel-removed",
        syncState: baseSyncState,
      },
    );
  });

  it("skips delta events when the guild does not exist yet", async () => {
    mockPrisma.guild.findUnique.mockResolvedValue(null);

    await service.handleGuildSyncStateUpdated({
      guildId: "missing-guild",
      syncState: {
        ...baseSyncState,
        guildId: "missing-guild",
      },
    });

    expect(mockPrisma.discordGuildSyncState.upsert).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith({
      message: "Skipped Discord sync event for unknown guild",
      guildId: "missing-guild",
      eventType: "sync-state-update",
    });
  });

  it("preserves the previous lastSuccessAt when a stale sync-state update arrives", async () => {
    await service.handleGuildSyncStateUpdated({
      guildId: "guild-1",
      syncState: {
        ...baseSyncState,
        status: DiscordGuildSyncStatus.STALE,
        lastSuccessAt: null,
      },
    });

    const syncUpsertCall =
      mockPrisma.discordGuildSyncState.upsert.mock.calls[0]?.[0];

    expect(syncUpsertCall.update).not.toHaveProperty("lastSuccessAt");
  });
});
