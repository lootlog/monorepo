import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler, Context, ContextOf, On, RoleUpdateHandler } from 'necord';
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

  @On(Events.GuildMemberAdd)
  public async handleGuildMemberAdd(
    @Context() [member]: ContextOf<Events.GuildMemberAdd>,
  ) {
    this.botService.handleGuildMemberAdd(member);
  }

  @On(Events.GuildMemberUpdate)
  public async handleGuildMemberUpdate(
    @Context() [oldMember, newMember]: ContextOf<Events.GuildMemberUpdate>,
  ) {
    this.botService.handleGuildMemberUpdate(oldMember, newMember);
  }

  @On(Events.GuildMemberRemove)
  public async handleGuildMemberDelete(
    @Context() [member]: ContextOf<Events.GuildMemberRemove>,
  ) {
    this.botService.handleGuildMemberDelete(member);
  }

  @On('guildMemberRoleAdd')
  public async handleGuildMemberRoleAdd(
    @Context() [member, role]: ContextOf<'guildMemberRoleAdd'>,
  ) {
    this.botService.handleGuildMemberRoleAdd(member, role);
  }

  @On('guildMemberRoleRemove')
  public async handleGuildMemberRoleRemove(
    @Context() [member, role]: ContextOf<'guildMemberRoleRemove'>,
  ) {
    this.botService.handleGuildMemberRoleRemove(member, role);
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
