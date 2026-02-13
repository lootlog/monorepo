import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'discord.js';
import type { DiscordGuildNotificationEventDto } from 'src/bot/dto/discord-guild-notification-event.dto';

@Injectable()
export class BotNotificationsService {
  private readonly logger = new Logger(BotNotificationsService.name);

  constructor(private readonly client: Client) {}

  async sendGuildNotification(data: DiscordGuildNotificationEventDto) {
    const channel = await this.client.channels
      .fetch(data.channelId)
      .catch(() => null);

    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      this.logger.warn(
        `Channel ${data.channelId} is not available for guild ${data.guildId}`,
      );
      return;
    }

    const content = this.buildNotificationContent(data);

    await channel.send({ content });
  }

  private buildNotificationContent(
    data: DiscordGuildNotificationEventDto,
  ): string {
    if (data.type === 'NPC_TITAN') {
      const npcName = data.npc?.name ?? 'Unknown';
      const npcLevel = data.npc?.lvl ? ` (lvl ${data.npc.lvl})` : '';
      return `:bell: [${data.world}] TITAN ${npcName}${npcLevel} - reported by <@${data.createdByDiscordId}>.`;
    }

    if (data.type === 'TEXT' && data.message) {
      return `:bell: [${data.world}] ${data.message}`;
    }

    return `:bell: [${data.world}] Notification from <@${data.createdByDiscordId}>.`;
  }
}
