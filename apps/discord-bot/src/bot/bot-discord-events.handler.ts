import { Injectable, Logger } from '@nestjs/common';
import { Context, ContextOf, On } from 'necord';
import { Events } from 'discord.js';
import { BotService } from 'src/bot/bot.service';

@Injectable()
export class BotDiscordEventsHandler {
  private readonly logger = new Logger(BotDiscordEventsHandler.name);

  constructor(private readonly botService: BotService) {}

  @On(Events.ClientReady)
  public async handleReady(@Context() [client]: ContextOf<Events.ClientReady>) {
    this.logger.log('Bot is ready and logged in as: ', client.user.username);
  }

  @On(Events.GuildCreate)
  public async handleGuildCreate(
    @Context() [guild]: ContextOf<Events.GuildCreate>,
  ) {
    this.botService.handleGuildCreate(guild);
  }

  @On(Events.GuildUpdate)
  public async handleGuildUpdate(
    @Context() [oldGuild, newGuild]: ContextOf<Events.GuildUpdate>,
  ) {
    this.botService.handleGuildUpdate(oldGuild, newGuild);
  }

  @On(Events.GuildDelete)
  async handleGuildDelete(@Context() [guild]: ContextOf<Events.GuildDelete>) {
    this.botService.handleGuildDelete(guild);
  }

  @On(Events.GuildRoleCreate)
  async handleGuildRoleCreate(
    @Context() [role]: ContextOf<Events.GuildRoleCreate>,
  ) {
    this.botService.handleGuildRoleCreate(role);
  }

  @On(Events.GuildRoleUpdate)
  async handleGuildRoleUpdate(
    @Context() [oldRole, newRole]: ContextOf<Events.GuildRoleUpdate>,
  ) {
    this.botService.handleGuildRoleUpdate(oldRole, newRole);
  }

  @On(Events.GuildRoleDelete)
  async handleGuildRoleDelete(
    @Context() [role]: ContextOf<Events.GuildRoleDelete>,
  ) {
    this.botService.handleGuildRoleDelete(role);
  }
}
