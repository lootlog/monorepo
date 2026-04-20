import type { Mock } from "vitest";
import {
  Events,
  type Channel,
  type Client,
  type Guild,
  type Role,
} from "discord.js";
import { registerDiscordEventHandlers } from "./register-discord-event-handlers.js";

describe("registerDiscordEventHandlers", () => {
  let client: {
    on: Mock;
  };
  let discordSyncService: {
    handleClientReady: Mock;
    handleGuildCreate: Mock;
    handleGuildUpdate: Mock;
    handleGuildDelete: Mock;
    handleGuildRoleCreate: Mock;
    handleGuildRoleUpdate: Mock;
    handleGuildRoleDelete: Mock;
    handleChannelCreate: Mock;
    handleChannelUpdate: Mock;
    handleChannelDelete: Mock;
  };

  beforeEach(() => {
    client = {
      on: vi.fn(),
    };
    discordSyncService = {
      handleClientReady: vi.fn(),
      handleGuildCreate: vi.fn(),
      handleGuildUpdate: vi.fn(),
      handleGuildDelete: vi.fn(),
      handleGuildRoleCreate: vi.fn(),
      handleGuildRoleUpdate: vi.fn(),
      handleGuildRoleDelete: vi.fn(),
      handleChannelCreate: vi.fn(),
      handleChannelUpdate: vi.fn(),
      handleChannelDelete: vi.fn(),
    };
  });

  it("registers Discord event listeners", () => {
    registerDiscordEventHandlers(
      client as unknown as Client,
      discordSyncService as never,
    );

    expect(client.on).toHaveBeenCalledWith(
      Events.ClientReady,
      expect.any(Function),
    );
    expect(client.on).toHaveBeenCalledWith(
      Events.GuildCreate,
      expect.any(Function),
    );
    expect(client.on).toHaveBeenCalledWith(
      Events.ChannelDelete,
      expect.any(Function),
    );
  });

  it("forwards guild events to DiscordSyncService", async () => {
    registerDiscordEventHandlers(
      client as unknown as Client,
      discordSyncService as never,
    );

    const guildCreateHandler = client.on.mock.calls.find(
      ([eventName]) => eventName === Events.GuildCreate,
    )?.[1] as ((guild: Guild) => Promise<void>) | undefined;
    const guildUpdateHandler = client.on.mock.calls.find(
      ([eventName]) => eventName === Events.GuildUpdate,
    )?.[1] as ((oldGuild: Guild, newGuild: Guild) => Promise<void>) | undefined;

    const guild = { id: "guild-1" } as Guild;
    const updatedGuild = { id: "guild-2" } as Guild;

    if (!guildCreateHandler || !guildUpdateHandler) {
      throw new Error("Expected guild handlers to be registered");
    }

    await guildCreateHandler(guild);
    await guildUpdateHandler(guild, updatedGuild);

    expect(discordSyncService.handleGuildCreate).toHaveBeenCalledWith(guild);
    expect(discordSyncService.handleGuildUpdate).toHaveBeenCalledWith(
      guild,
      updatedGuild,
    );
  });

  it("ignores non-guild channels and forwards guild channels", async () => {
    registerDiscordEventHandlers(
      client as unknown as Client,
      discordSyncService as never,
    );

    const channelCreateHandler = client.on.mock.calls.find(
      ([eventName]) => eventName === Events.ChannelCreate,
    )?.[1] as ((channel: Channel) => Promise<void>) | undefined;

    if (!channelCreateHandler) {
      throw new Error("Expected channel create handler to be registered");
    }

    await channelCreateHandler({ id: "dm" } as Channel);
    expect(discordSyncService.handleChannelCreate).not.toHaveBeenCalled();

    const guildChannel = {
      id: "channel-1",
      guild: { id: "guild-1" },
    } as unknown as Channel;

    await channelCreateHandler(guildChannel);
    expect(discordSyncService.handleChannelCreate).toHaveBeenCalledWith(
      guildChannel,
    );
  });

  it("forwards role events to DiscordSyncService", async () => {
    registerDiscordEventHandlers(
      client as unknown as Client,
      discordSyncService as never,
    );

    const roleUpdateHandler = client.on.mock.calls.find(
      ([eventName]) => eventName === Events.GuildRoleUpdate,
    )?.[1] as ((oldRole: Role, newRole: Role) => Promise<void>) | undefined;

    if (!roleUpdateHandler) {
      throw new Error("Expected role update handler to be registered");
    }

    const oldRole = { id: "role-1" } as Role;
    const newRole = { id: "role-2" } as Role;

    await roleUpdateHandler(oldRole, newRole);

    expect(discordSyncService.handleGuildRoleUpdate).toHaveBeenCalledWith(
      oldRole,
      newRole,
    );
  });
});
