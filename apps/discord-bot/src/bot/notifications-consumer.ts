import type { DiscordNotificationSendCommand } from "@lootlog/types";
import type { DiscordDeliveryService } from "./discord-delivery.service.js";

export class NotificationsConsumer {
  constructor(
    private readonly discordDeliveryService: DiscordDeliveryService,
  ) {}

  async handleNotificationSend(command: DiscordNotificationSendCommand) {
    await this.discordDeliveryService.sendNotification(command);
  }
}
