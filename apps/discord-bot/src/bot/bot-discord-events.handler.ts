import { Events, type Client, type GuildBasedChannel } from "discord.js";
import { DiscordSyncService } from "#src/bot/discord-sync.service";

export const registerDiscordEventHandlers = (
  client: Client,
  sync: DiscordSyncService,
): void => {
  client.on(
    Events.ClientReady,
    (readyClient) => void sync.handleClientReady(readyClient),
  );
  client.on(Events.GuildCreate, (guild) => void sync.handleGuildCreate(guild));
  client.on(
    Events.GuildUpdate,
    (oldGuild, newGuild) => void sync.handleGuildUpdate(oldGuild, newGuild),
  );
  client.on(Events.GuildDelete, (guild) => void sync.handleGuildDelete(guild));
  client.on(
    Events.GuildRoleCreate,
    (role) => void sync.handleGuildRoleCreate(role),
  );
  client.on(
    Events.GuildRoleUpdate,
    (oldRole, newRole) => void sync.handleGuildRoleUpdate(oldRole, newRole),
  );
  client.on(
    Events.GuildRoleDelete,
    (role) => void sync.handleGuildRoleDelete(role),
  );
  client.on(Events.ChannelCreate, (channel) => {
    if ("guild" in channel && channel.guild)
      void sync.handleChannelCreate(channel as GuildBasedChannel);
  });
  client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
    if (
      "guild" in oldChannel &&
      oldChannel.guild &&
      "guild" in newChannel &&
      newChannel.guild
    )
      void sync.handleChannelUpdate(
        oldChannel as GuildBasedChannel,
        newChannel as GuildBasedChannel,
      );
  });
  client.on(Events.ChannelDelete, (channel) => {
    if ("guild" in channel && channel.guild)
      void sync.handleChannelDelete(channel as GuildBasedChannel);
  });
};
