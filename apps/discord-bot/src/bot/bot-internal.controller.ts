import { Controller, Get, Param, Post } from "@nestjs/common";
import { DiscordSyncService } from "#src/bot/discord-sync.service";

@Controller("internal/guilds/:guildId")
export class BotInternalController {
  constructor(private readonly discordSyncService: DiscordSyncService) {}

  @Get("channels")
  async getGuildChannels(@Param("guildId") guildId: string) {
    return this.discordSyncService.getGuildChannels(guildId);
  }

  @Post("channels/refresh")
  async refreshGuildChannels(@Param("guildId") guildId: string) {
    return this.discordSyncService.refreshGuildChannels(guildId);
  }

  @Get("sync-status")
  async getGuildSyncStatus(@Param("guildId") guildId: string) {
    return this.discordSyncService.getGuildSyncStatus(guildId);
  }
}
