import type { DiscordNotificationSendCommand } from "@lootlog/schema/notifications";
import { DiscordDeliveryService } from "#src/bot/discord-delivery.service";

export class BotNotificationsConsumer {
  constructor(
    private readonly discordDeliveryService: DiscordDeliveryService,
  ) {}
  async handleNotificationSend(
    command: DiscordNotificationSendCommand,
  ): Promise<void> {
    await this.discordDeliveryService.sendNotification(command);
  }
}
