import { Events, type Client, type GuildBasedChannel } from "discord.js";
import { Effect } from "effect";
import type { DiscordSync } from "#src/bot/discord-sync.service";

type RunEvent = (event: Effect.Effect<void>) => unknown;

const runEvent = (run: RunEvent, event: Effect.Effect<void, unknown>) =>
  run(
    event.pipe(
      Effect.catchCause((cause) =>
        Effect.logError("Discord event synchronization failed", cause),
      ),
    ),
  );

export const registerDiscordEventHandlers = (
  client: Client,
  sync: DiscordSync,
  run: RunEvent,
): void => {
  client.on(
    Events.ClientReady,
    (readyClient) => void runEvent(run, sync.handleClientReady(readyClient)),
  );
  client.on(
    Events.GuildCreate,
    (guild) => void runEvent(run, sync.handleGuildCreate(guild)),
  );
  client.on(
    Events.GuildUpdate,
    (oldGuild, newGuild) =>
      void runEvent(run, sync.handleGuildUpdate(oldGuild, newGuild)),
  );
  client.on(
    Events.GuildDelete,
    (guild) => void runEvent(run, sync.handleGuildDelete(guild)),
  );
  client.on(
    Events.GuildRoleCreate,
    (role) => void runEvent(run, sync.handleGuildRoleCreate(role)),
  );
  client.on(
    Events.GuildRoleUpdate,
    (oldRole, newRole) =>
      void runEvent(run, sync.handleGuildRoleUpdate(oldRole, newRole)),
  );
  client.on(
    Events.GuildRoleDelete,
    (role) => void runEvent(run, sync.handleGuildRoleDelete(role)),
  );
  client.on(Events.ChannelCreate, (channel) => {
    if ("guild" in channel && channel.guild)
      void runEvent(
        run,
        sync.handleChannelCreate(channel as GuildBasedChannel),
      );
  });
  client.on(Events.ChannelUpdate, (oldChannel, newChannel) => {
    if (
      "guild" in oldChannel &&
      oldChannel.guild &&
      "guild" in newChannel &&
      newChannel.guild
    )
      void runEvent(
        run,
        sync.handleChannelUpdate(
          oldChannel as GuildBasedChannel,
          newChannel as GuildBasedChannel,
        ),
      );
  });
  client.on(Events.ChannelDelete, (channel) => {
    if ("guild" in channel && channel.guild)
      void runEvent(
        run,
        sync.handleChannelDelete(channel as GuildBasedChannel),
      );
  });
};
