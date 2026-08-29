import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import type { DiscordNotificationSendCommand } from "@lootlog/types";
import { DiscordDeliveryService } from "#src/bot/discord-delivery.service";
import { RoutingKey } from "#src/bot/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";

@Injectable()
export class BotNotificationsConsumer {
  constructor(
    private readonly discordDeliveryService: DiscordDeliveryService,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_DISCORD_SEND,
    queue: "discord-bot-notifications-send",
    queueOptions: {
      durable: true,
    },
  })
  async handleNotificationSend(command: DiscordNotificationSendCommand) {
    await this.discordDeliveryService.sendNotification(command);
  }
}
