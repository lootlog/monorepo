import { Injectable } from "@nestjs/common";
import type {
  DiscordGuildChannelSnapshot,
  DiscordGuildSyncState,
} from "@lootlog/schema/notifications";
import { discordBotConfig } from "#src/config/discord-bot.config";

@Injectable()
export class DiscordBotClientService {
  private readonly serviceUrl: string;

  constructor() {
    this.serviceUrl = discordBotConfig.serviceUrl;
  }

  async getGuildChannels(guildId: string): Promise<{
    channels: DiscordGuildChannelSnapshot[];
    syncState: DiscordGuildSyncState;
  }> {
    return this.request(
      `${this.serviceUrl}/internal/guilds/${guildId}/channels`,
      "GET",
      5000,
    );
  }

  async refreshGuildChannels(guildId: string): Promise<{
    channels: DiscordGuildChannelSnapshot[];
    syncState: DiscordGuildSyncState;
  }> {
    return this.request(
      `${this.serviceUrl}/internal/guilds/${guildId}/channels/refresh`,
      "POST",
      10_000,
    );
  }

  async getGuildSyncStatus(guildId: string): Promise<DiscordGuildSyncState> {
    return this.request(
      `${this.serviceUrl}/internal/guilds/${guildId}/sync-status`,
      "GET",
      5000,
    );
  }

  private async request<A>(
    url: string,
    method: "GET" | "POST",
    timeout: number,
  ) {
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "content-type": "application/json" } : {},
      body: method === "POST" ? "{}" : undefined,
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      throw new Error(`Discord Bot request failed: ${response.status}`);
    }
    return (await response.json()) as A;
  }
}
