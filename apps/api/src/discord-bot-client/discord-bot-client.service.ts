import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import type {
  DiscordGuildChannelSnapshot,
  DiscordGuildSyncState,
} from "@lootlog/types";
import { firstValueFrom } from "rxjs";
import { discordBotConfig } from "src/config/discord-bot.config";

@Injectable()
export class DiscordBotClientService {
  private readonly serviceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.serviceUrl = discordBotConfig.serviceUrl;
  }

  async getGuildChannels(guildId: string): Promise<{
    channels: DiscordGuildChannelSnapshot[];
    syncState: DiscordGuildSyncState;
  }> {
    const response = await firstValueFrom(
      this.httpService.get<{
        channels: DiscordGuildChannelSnapshot[];
        syncState: DiscordGuildSyncState;
      }>(`${this.serviceUrl}/internal/guilds/${guildId}/channels`, {
        timeout: 5000,
      }),
    );

    return response.data;
  }

  async refreshGuildChannels(guildId: string): Promise<{
    channels: DiscordGuildChannelSnapshot[];
    syncState: DiscordGuildSyncState;
  }> {
    const response = await firstValueFrom(
      this.httpService.post<{
        channels: DiscordGuildChannelSnapshot[];
        syncState: DiscordGuildSyncState;
      }>(
        `${this.serviceUrl}/internal/guilds/${guildId}/channels/refresh`,
        {},
        { timeout: 10000 },
      ),
    );

    return response.data;
  }

  async getGuildSyncStatus(guildId: string): Promise<DiscordGuildSyncState> {
    const response = await firstValueFrom(
      this.httpService.get<DiscordGuildSyncState>(
        `${this.serviceUrl}/internal/guilds/${guildId}/sync-status`,
        { timeout: 5000 },
      ),
    );

    return response.data;
  }
}
