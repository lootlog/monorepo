import type { Mock } from "vitest";
import { DiscordGuildSyncStatus } from "@lootlog/types";
import {
  ChannelType,
  Client,
  Collection,
  DiscordAPIError,
  PermissionsBitField,
  type Guild,
  type GuildBasedChannel,
  type Role,
} from "discord.js";
import { DEFAULT_EXCHANGE_NAME } from "../config/rabbitmq.config.js";
import { DiscordSyncService } from "./discord-sync.service.js";
import { RoutingKey } from "./enums/routing-key.enum.js";

const REQUIRED_NOTIFICATION_PERMISSION_FLAGS = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.AttachFiles,
  PermissionsBitField.Flags.ReadMessageHistory,
];

describe("DiscordSyncService", () => {
  let service: DiscordSyncService;
  let eventPublisher: { publish: Mock };
  let mockClient: {
    guilds: {
      cache: Collection<string, Guild>;
      fetch: Mock;
    };
  };

  const createPermissionSet = (flags: bigint[] = []) =>
    new PermissionsBitField(flags);

  const createChannel = ({
    id,
    name,
    position,
    type = ChannelType.GuildText,
    allowedFlags = REQUIRED_NOTIFICATION_PERMISSION_FLAGS,
  }: {
    id: string;
    name: string;
    position: number;
    type?: ChannelType;
    allowedFlags?: bigint[];
  }) =>
    ({
      id,
      name,
      type,
      parentId: null,
      rawPosition: position,
      permissionsFor: vi
        .fn()
        .mockReturnValue(createPermissionSet(allowedFlags)),
    }) as unknown as GuildBasedChannel;

  const createGuild = () => {
    const fetchedChannels = new Collection<string, GuildBasedChannel>();
    fetchedChannels.set(
      "channel-2",
      createChannel({
        id: "channel-2",
        name: "boss-alerts",
        position: 2,
      }),
    );
    fetchedChannels.set(
      "channel-1",
      createChannel({
        id: "channel-1",
        name: "announcements",
        position: 1,
        type: ChannelType.GuildAnnouncement,
        allowedFlags: [PermissionsBitField.Flags.ViewChannel],
      }),
    );
    fetchedChannels.set(
      "channel-ignored",
      createChannel({
        id: "channel-ignored",
        name: "voice",
        position: 3,
        type: ChannelType.GuildVoice,
      }),
    );

    const roles = new Collection<string, Role>();
    roles.set("role-admin", {
      id: "role-admin",
      name: "Admin",
      color: 0xff0000,
      position: 5,
      permissions: {
        bitfield: PermissionsBitField.Flags.Administrator,
      },
    } as Role);
    roles.set("role-member", {
      id: "role-member",
      name: "Member",
      color: 0x00ff00,
      position: 1,
      permissions: {
        bitfield: BigInt(0),
      },
    } as Role);

    const guild = {
      id: "guild-123",
      name: "Lootlog",
      ownerId: "owner-123",
      iconURL: vi.fn().mockReturnValue("https://example.com/icon.png"),
      roles: {
        fetch: vi.fn().mockResolvedValue(roles),
      },
      members: {
        me: {
          user: {
            id: "bot-user",
          },
          permissions: createPermissionSet(
            REQUIRED_NOTIFICATION_PERMISSION_FLAGS,
          ),
        },
        fetchMe: vi.fn(),
      },
      channels: {
        cache: fetchedChannels,
        fetch: vi.fn().mockResolvedValue(fetchedChannels),
      },
    } as unknown as Guild;

    for (const channel of fetchedChannels.values()) {
      Object.assign(channel, {
        guild,
      });
    }

    return { guild, fetchedChannels };
  };

  const createDiscordApiError = (message: string, code: number) => {
    const error = new Error(message) as DiscordAPIError;

    Object.setPrototypeOf(error, DiscordAPIError.prototype);

    return Object.assign(error, {
      code,
      status: code,
      method: "GET",
      url: "/guilds/guild-123",
      requestBody: {
        files: [],
        json: null,
      },
    });
  };

  beforeEach(async () => {
    eventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };
    mockClient = {
      guilds: {
        cache: new Collection<string, Guild>(),
        fetch: vi.fn(),
      },
    };

    service = new DiscordSyncService(
      eventPublisher,
      mockClient as unknown as Client,
    );
  });

  it("publishes guild create without racing sync-state publish", async () => {
    const { guild } = createGuild();

    await service.handleGuildCreate(guild);

    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_CREATE,
      {
        guildId: "guild-123",
        name: "Lootlog",
        icon: "https://example.com/icon.png",
        ownerId: "owner-123",
        roles: [
          {
            id: "role-admin",
            name: "Admin",
            color: 0xff0000,
            admin: true,
            position: 5,
          },
          {
            id: "role-member",
            name: "Member",
            color: 0x00ff00,
            admin: false,
            position: 1,
          },
        ],
      },
    );
    expect(eventPublisher.publish).toHaveBeenCalledTimes(1);
  });

  it("does not publish sync updates on client ready", async () => {
    const { guild } = createGuild();
    const readyClient = {
      user: {
        username: "lootlog-bot",
      },
      guilds: {
        cache: new Collection<string, Guild>([[guild.id, guild]]),
      },
    } as unknown as Client;

    await service.handleClientReady(readyClient);

    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it("publishes a stale sync-state update after role changes", async () => {
    const { guild } = createGuild();

    const oldRole = {
      id: "role-member",
      name: "Member",
      color: 0x00ff00,
      position: 1,
      permissions: {
        bitfield: BigInt(0),
      },
      guild,
    } as Role;
    const newRole = {
      id: "role-member",
      name: "Raid Leader",
      color: 0x123456,
      position: 2,
      permissions: {
        bitfield: PermissionsBitField.Flags.Administrator,
      },
      guild,
    } as Role;

    await service.handleGuildRoleUpdate(oldRole, newRole);

    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      1,
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE_ROLE,
      {
        guildId: "guild-123",
        id: "role-member",
        name: "Raid Leader",
        color: 0x123456,
        position: 2,
        admin: true,
      },
    );
    expect(eventPublisher.publish).toHaveBeenNthCalledWith(
      2,
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
      expect.objectContaining({
        guildId: "guild-123",
        syncState: expect.objectContaining({
          status: DiscordGuildSyncStatus.STALE,
          lastSuccessAt: null,
        }),
      }),
    );
  });

  it("publishes a channel upsert delta for supported channels", async () => {
    const { guild, fetchedChannels } = createGuild();
    const channel = fetchedChannels.get("channel-2");

    if (!channel) {
      throw new Error("Expected channel-2 to exist");
    }

    await service.handleChannelCreate(channel);

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
      expect.objectContaining({
        guildId: guild.id,
        channel: expect.objectContaining({
          channelId: "channel-2",
          channelType: "GuildText",
          canView: true,
          canSend: true,
          hasRequiredPermissions: true,
          missingPermissions: [],
        }),
        syncState: expect.objectContaining({
          guildId: guild.id,
          status: DiscordGuildSyncStatus.SYNCED,
          channelCount: 2,
          selectableChannelCount: 1,
        }),
      }),
    );
  });

  it("publishes a channel delete delta and excludes removed channel from counts", async () => {
    const { guild, fetchedChannels } = createGuild();
    const channel = fetchedChannels.get("channel-2");

    if (!channel) {
      throw new Error("Expected channel-2 to exist");
    }

    await service.handleChannelDelete(channel);

    expect(eventPublisher.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      expect.objectContaining({
        guildId: guild.id,
        channelId: "channel-2",
        syncState: expect.objectContaining({
          guildId: guild.id,
          status: DiscordGuildSyncStatus.SYNCED,
          channelCount: 1,
          selectableChannelCount: 0,
        }),
      }),
    );
  });

  it("returns full channel payload for on-demand refresh", async () => {
    const { guild } = createGuild();
    mockClient.guilds.cache.set(guild.id, guild);

    const payload = await service.getGuildChannels(guild.id);

    expect(guild.channels.fetch).toHaveBeenCalled();
    expect(payload).toEqual(
      expect.objectContaining({
        guildId: "guild-123",
        channels: [
          expect.objectContaining({
            channelId: "channel-1",
            channelType: "GuildAnnouncement",
          }),
          expect.objectContaining({
            channelId: "channel-2",
            channelType: "GuildText",
            hasRequiredPermissions: true,
          }),
        ],
        syncState: expect.objectContaining({
          guildId: "guild-123",
          status: DiscordGuildSyncStatus.SYNCED,
          channelCount: 2,
          selectableChannelCount: 1,
        }),
      }),
    );
  });

  it("returns live sync status using an authoritative channel fetch", async () => {
    const { guild } = createGuild();
    Object.assign(guild.channels, {
      cache: new Collection<string, GuildBasedChannel>(),
    });
    mockClient.guilds.cache.set(guild.id, guild);

    const syncStatus = await service.getGuildSyncStatus(guild.id);

    expect(guild.channels.fetch).toHaveBeenCalledWith(undefined, {
      force: true,
    });
    expect(syncStatus).toEqual(
      expect.objectContaining({
        guildId: "guild-123",
        status: DiscordGuildSyncStatus.SYNCED,
        hasRequiredPermissions: true,
        channelCount: 2,
        selectableChannelCount: 1,
      }),
    );
  });

  it("returns NOT_FOUND only for permanent Discord access loss", async () => {
    mockClient.guilds.fetch.mockRejectedValueOnce(
      createDiscordApiError("Missing Access", 50_001),
    );

    const payload = await service.getGuildChannels("guild-123");

    expect(payload).toEqual(
      expect.objectContaining({
        guildId: "guild-123",
        channels: [],
        syncState: expect.objectContaining({
          status: DiscordGuildSyncStatus.NOT_FOUND,
          lastError: "Guild not found by Discord bot",
        }),
      }),
    );
  });

  it("throws for transient guild lookup failures instead of degrading to NOT_FOUND", async () => {
    mockClient.guilds.fetch.mockRejectedValueOnce(
      new Error("Discord unavailable"),
    );

    await expect(service.getGuildChannels("guild-123")).rejects.toThrow(
      "Discord unavailable",
    );
  });
});
