import { Effect } from "effect";
import { Events, type Client, type GuildBasedChannel } from "discord.js";
import type { DiscordSync } from "#src/bot/discord-sync.service";

const runEvent = (event: Effect.Effect<void, unknown>) =>
  Effect.runFork(
    event.pipe(
      Effect.catchCause((cause) =>
        Effect.logError("Discord event synchronization failed", cause),
      ),
    ),
  );

export const registerDiscordEventHandlers = (
  client: Client,
  sync: DiscordSync,
): void => {
  client.on(
    Events.ClientReady,
    (readyClient) => void runEvent(sync.handleClientReady(readyClient)),
  );
  client.on(
    Events.GuildCreate,
    (guild) => void runEvent(sync.handleGuildCreate(guild)),
  );
  client.on(
    Events.GuildUpdate,
    (oldGuild, newGuild) =>
      void runEvent(sync.handleGuildUpdate(oldGuild, newGuild)),
  );
  client.on(
    Events.GuildDelete,
    (guild) => void runEvent(sync.handleGuildDelete(guild)),
  );
  client.on(
    Events.GuildRoleCreate,
    (role) => void runEvent(sync.handleGuildRoleCreate(role)),
  );
  client.on(
    Events.GuildRoleUpdate,
    (oldRole, newRole) =>
      void runEvent(sync.handleGuildRoleUpdate(oldRole, newRole)),
  );
  client.on(
    Events.GuildRoleDelete,
    (role) => void runEvent(sync.handleGuildRoleDelete(role)),
  );
  client.on(Events.ChannelCreate, (channel) => {
    if ("guild" in channel && channel.guild)
      void runEvent(sync.handleChannelCreate(channel as GuildBasedChannel));
  });
  client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
    if (
      "guild" in oldChannel &&
      oldChannel.guild &&
      "guild" in newChannel &&
      newChannel.guild
    )
      void runEvent(
        sync.handleChannelUpdate(
          oldChannel as GuildBasedChannel,
          newChannel as GuildBasedChannel,
        ),
      );
  });
  client.on(Events.ChannelDelete, (channel) => {
    if ("guild" in channel && channel.guild)
      void runEvent(sync.handleChannelDelete(channel as GuildBasedChannel));
  });
};
