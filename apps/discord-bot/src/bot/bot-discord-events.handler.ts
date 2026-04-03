import { Injectable } from "@nestjs/common";
import { Context, On, type ContextOf } from "necord";
import { Events } from "discord.js";
import { DiscordSyncService } from "src/bot/discord-sync.service";

@Injectable()
export class BotDiscordEventsHandler {
  constructor(private readonly discordSyncService: DiscordSyncService) {}

  @On(Events.ClientReady)
  public async handleReady(@Context() [client]: ContextOf<Events.ClientReady>) {
    await this.discordSyncService.handleClientReady(client);
  }

  @On(Events.GuildCreate)
  public async handleGuildCreate(
    @Context() [guild]: ContextOf<Events.GuildCreate>,
  ) {
    await this.discordSyncService.handleGuildCreate(guild);
  }

  @On(Events.GuildUpdate)
  public async handleGuildUpdate(
    @Context() [oldGuild, newGuild]: ContextOf<Events.GuildUpdate>,
  ) {
    await this.discordSyncService.handleGuildUpdate(oldGuild, newGuild);
  }

  @On(Events.GuildDelete)
  async handleGuildDelete(@Context() [guild]: ContextOf<Events.GuildDelete>) {
    await this.discordSyncService.handleGuildDelete(guild);
  }

  @On(Events.GuildRoleCreate)
  async handleGuildRoleCreate(
    @Context() [role]: ContextOf<Events.GuildRoleCreate>,
  ) {
    await this.discordSyncService.handleGuildRoleCreate(role);
  }

  @On(Events.GuildRoleUpdate)
  async handleGuildRoleUpdate(
    @Context() [oldRole, newRole]: ContextOf<Events.GuildRoleUpdate>,
  ) {
    await this.discordSyncService.handleGuildRoleUpdate(oldRole, newRole);
  }

  @On(Events.GuildRoleDelete)
  async handleGuildRoleDelete(
    @Context() [role]: ContextOf<Events.GuildRoleDelete>,
  ) {
    await this.discordSyncService.handleGuildRoleDelete(role);
  }

  @On(Events.ChannelCreate)
  async handleChannelCreate(
    @Context() [channel]: ContextOf<Events.ChannelCreate>,
  ) {
    if (!channel.guild) {
      return;
    }

    await this.discordSyncService.handleChannelCreate(channel);
  }

  @On(Events.ChannelUpdate)
  async handleChannelUpdate(
    @Context() [oldChannel, newChannel]: ContextOf<Events.ChannelUpdate>,
  ) {
    if (
      !("guild" in oldChannel) ||
      !oldChannel.guild ||
      !("guild" in newChannel) ||
      !newChannel.guild
    ) {
      return;
    }

    await this.discordSyncService.handleChannelUpdate(oldChannel, newChannel);
  }

  @On(Events.ChannelDelete)
  async handleChannelDelete(
    @Context() [channel]: ContextOf<Events.ChannelDelete>,
  ) {
    if (!("guild" in channel) || !channel.guild) {
      return;
    }

    await this.discordSyncService.handleChannelDelete(channel);
  }
}
