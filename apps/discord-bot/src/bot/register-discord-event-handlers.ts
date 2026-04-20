import {
  Events,
  type Channel,
  type Guild,
  type GuildBasedChannel,
  type Role,
  type Client,
} from "discord.js";
import type { DiscordSyncService } from "./discord-sync.service.js";

function isGuildChannel(channel: Channel): channel is GuildBasedChannel {
  return "guild" in channel && channel.guild !== null;
}

export function registerDiscordEventHandlers(
  client: Client,
  discordSyncService: DiscordSyncService,
) {
  client.on(Events.ClientReady, async (readyClient) => {
    await discordSyncService.handleClientReady(readyClient);
  });

  client.on(Events.GuildCreate, async (guild: Guild) => {
    await discordSyncService.handleGuildCreate(guild);
  });

  client.on(Events.GuildUpdate, async (oldGuild: Guild, newGuild: Guild) => {
    await discordSyncService.handleGuildUpdate(oldGuild, newGuild);
  });

  client.on(Events.GuildDelete, async (guild: Guild) => {
    await discordSyncService.handleGuildDelete(guild);
  });

  client.on(Events.GuildRoleCreate, async (role: Role) => {
    await discordSyncService.handleGuildRoleCreate(role);
  });

  client.on(Events.GuildRoleUpdate, async (oldRole: Role, newRole: Role) => {
    await discordSyncService.handleGuildRoleUpdate(oldRole, newRole);
  });

  client.on(Events.GuildRoleDelete, async (role: Role) => {
    await discordSyncService.handleGuildRoleDelete(role);
  });

  client.on(Events.ChannelCreate, async (channel: Channel) => {
    if (!isGuildChannel(channel)) {
      return;
    }

    await discordSyncService.handleChannelCreate(channel);
  });

  client.on(
    Events.ChannelUpdate,
    async (oldChannel: Channel, newChannel: Channel) => {
      if (!isGuildChannel(oldChannel) || !isGuildChannel(newChannel)) {
        return;
      }

      await discordSyncService.handleChannelUpdate(oldChannel, newChannel);
    },
  );

  client.on(Events.ChannelDelete, async (channel: Channel) => {
    if (!isGuildChannel(channel)) {
      return;
    }

    await discordSyncService.handleChannelDelete(channel);
  });
}
