import { Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import { discordChannelCache } from "src/shared/modules/drizzle/schema";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class DiscordChannelsService {
  private readonly logger = new Logger(DiscordChannelsService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  async getChannels(discordGuildId: string) {
    const cached = await this.drizzle.db
      .select()
      .from(discordChannelCache)
      .where(eq(discordChannelCache.discordGuildId, discordGuildId));

    if (cached.length && this.isCacheFresh(cached[0].cachedAt)) {
      return cached;
    }

    const fresh = await this.fetchFromDiscordBot(discordGuildId);
    if (fresh) {
      await this.updateCache(discordGuildId, fresh);
      return fresh;
    }

    return cached;
  }

  private isCacheFresh(cachedAt: Date): boolean {
    return Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
  }

  private async fetchFromDiscordBot(
    discordGuildId: string,
  ): Promise<
    Array<{ channelId: string; channelName: string; channelType: string }> | null
  > {
    const discordBotUrl = process.env.DISCORD_BOT_URL;
    if (!discordBotUrl) {
      this.logger.warn("DISCORD_BOT_URL not configured");
      return null;
    }

    try {
      const response = await fetch(
        `${discordBotUrl}/channels?guildId=${discordGuildId}`,
      );
      if (!response.ok) {
        this.logger.warn(
          `Discord bot returned ${response.status} for guild ${discordGuildId}`,
        );
        return null;
      }
      return response.json();
    } catch (error) {
      this.logger.error(
        `Failed to fetch channels from discord-bot: ${error}`,
      );
      return null;
    }
  }

  async getBotStatus(discordGuildId: string) {
    const discordBotUrl = process.env.DISCORD_BOT_URL;
    if (!discordBotUrl) {
      this.logger.warn("DISCORD_BOT_URL not configured");
      return null;
    }

    try {
      const response = await fetch(
        `${discordBotUrl}/bot-status?guildId=${discordGuildId}`,
      );
      if (!response.ok) {
        this.logger.warn(
          `Discord bot returned ${response.status} for bot-status guild ${discordGuildId}`,
        );
        return null;
      }
      return response.json();
    } catch (error) {
      this.logger.error(`Failed to fetch bot status: ${error}`);
      return null;
    }
  }

  private async updateCache(
    discordGuildId: string,
    channels: Array<{
      channelId: string;
      channelName: string;
      channelType: string;
    }>,
  ) {
    await this.drizzle.db
      .delete(discordChannelCache)
      .where(eq(discordChannelCache.discordGuildId, discordGuildId));

    if (channels.length) {
      await this.drizzle.db.insert(discordChannelCache).values(
        channels.map((ch) => ({
          discordGuildId,
          channelId: ch.channelId,
          channelName: ch.channelName,
          channelType: ch.channelType,
          cachedAt: new Date(),
        })),
      );
    }
  }
}
