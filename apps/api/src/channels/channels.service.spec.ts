import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { mockFn } from "#src/test/mock-fn";
import { Test, type TestingModule } from "@nestjs/testing";
import { DiscordGuildSyncStatus } from "@lootlog/schema/notifications";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { ChannelsService } from "./channels.service.js";
import { DiscordBotClientService } from "#src/discord-bot-client/discord-bot-client.service";
import { ChannelsRepository } from "./channels.repository.js";

vi.mock("#src/config/discord-bot.config", () => ({
  discordBotConfig: { channelSnapshotStaleSeconds: 300 },
}));

describe("ChannelsService", () => {
  let service: ChannelsService;

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

  const mockRepository = {
    guildExists: mockFn(),
    loadGuildDiscordState: mockFn(),
    listChannelIds: mockFn(),
    markGuildSyncStale: mockFn(),
    upsertSyncState: mockFn(),
    upsertFailure: mockFn(),
    upsertChannel: mockFn(),
    deleteChannel: mockFn(),
    reconcile: mockFn(),
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
    mockAmqpConnection.publish.mockResolvedValue(undefined);
    mockRepository.guildExists.mockResolvedValue(true);
    mockRepository.markGuildSyncStale.mockResolvedValue(undefined);
    mockRepository.upsertSyncState.mockResolvedValue(undefined);
    mockRepository.upsertFailure.mockResolvedValue(undefined);
    mockRepository.upsertChannel.mockResolvedValue(undefined);
    mockRepository.deleteChannel.mockResolvedValue(undefined);
    mockRepository.reconcile.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: ChannelsRepository,
          useValue: mockRepository,
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
    mockRepository.loadGuildDiscordState
      .mockResolvedValueOnce({
        channels: [baseChannel],
        syncState: {
          ...baseSyncState,
          updatedAt: new Date(baseSyncState.updatedAt),
          status: DiscordGuildSyncStatus.STALE,
        },
      })
      .mockResolvedValueOnce({
        channels: [baseChannel],
        syncState: {
          ...baseSyncState,
          updatedAt: new Date(baseSyncState.updatedAt),
          lastAttemptAt: new Date(baseSyncState.lastAttemptAt),
          lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
        },
      });
    mockRepository.listChannelIds.mockResolvedValue([
      { channelId: "channel-1" },
    ]);
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
    mockRepository.loadGuildDiscordState.mockResolvedValueOnce({
      channels: [baseChannel],
      syncState: {
        ...baseSyncState,
        updatedAt: new Date(baseSyncState.updatedAt),
        lastAttemptAt: new Date(baseSyncState.lastAttemptAt),
        lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
        status: DiscordGuildSyncStatus.STALE,
      },
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
    expect(mockRepository.upsertFailure).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        status: DiscordGuildSyncStatus.FAILED,
        lastError: "Discord timeout",
      }),
    );
  });

  it("removes missing channels during full reconcile and emits delete events", async () => {
    mockDiscordBotClient.refreshGuildChannels.mockResolvedValue({
      channels: [baseChannel],
      syncState: baseSyncState,
    });
    mockRepository.listChannelIds.mockResolvedValue([
      { channelId: "channel-1" },
      { channelId: "channel-removed" },
    ]);
    mockRepository.loadGuildDiscordState.mockResolvedValueOnce({
      channels: [baseChannel],
      syncState: {
        ...baseSyncState,
        updatedAt: new Date(baseSyncState.updatedAt),
        lastAttemptAt: new Date(baseSyncState.lastAttemptAt),
        lastSuccessAt: new Date(baseSyncState.lastSuccessAt),
      },
    });

    await service.refreshGuildDiscordChannels("guild-1");

    expect(mockRepository.reconcile).toHaveBeenCalledWith(
      "guild-1",
      [baseChannel],
      ["channel-removed"],
      baseSyncState,
    );
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
    mockRepository.guildExists.mockResolvedValue(false);

    await service.handleGuildSyncStateUpdated({
      guildId: "missing-guild",
      syncState: {
        ...baseSyncState,
        guildId: "missing-guild",
      },
    });

    expect(mockRepository.upsertSyncState).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith({
      message: "Skipped Discord sync event for unknown guild",
      guildId: "missing-guild",
      eventType: "sync-state-update",
    });
  });

  it("does not synthesize lastSuccessAt for a stale sync-state update", async () => {
    await service.handleGuildSyncStateUpdated({
      guildId: "guild-1",
      syncState: {
        ...baseSyncState,
        status: DiscordGuildSyncStatus.STALE,
        lastSuccessAt: null,
      },
    });

    expect(mockRepository.upsertSyncState).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        status: DiscordGuildSyncStatus.STALE,
        lastSuccessAt: null,
      }),
    );
  });
});
