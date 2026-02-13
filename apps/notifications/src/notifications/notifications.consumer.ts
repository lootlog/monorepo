import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import type { GuildNotificationCommandDto } from "src/notifications/dto/guild-notification-command.dto";
import { Queue } from "src/notifications/enums/queue.enum";
import { RoutingKey } from "src/notifications/enums/routing-key.enum";
import { NotificationsService } from "src/notifications/notifications.service";

@Injectable()
export class NotificationsConsumer {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_GUILD_SEND_COMMAND,
    queue: Queue.NOTIFICATIONS_GUILD_SEND_COMMAND,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleGuildNotificationCommand(data: GuildNotificationCommandDto) {
    await this.notificationsService.handleGuildNotificationCommand(data);
  }
}
