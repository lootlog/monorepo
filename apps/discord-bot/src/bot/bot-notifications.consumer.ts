import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { BotNotificationsService } from 'src/bot/bot-notifications.service';
import type { DiscordGuildNotificationEventDto } from 'src/bot/dto/discord-guild-notification-event.dto';
import { Queue } from 'src/bot/enums/queue.enum';
import { RoutingKey } from 'src/bot/enums/routing-key.enum';

@Injectable()
export class BotNotificationsConsumer {
  constructor(
    private readonly botNotificationsService: BotNotificationsService,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_NOTIFICATIONS_GUILD_SEND,
    queue: Queue.DISCORD_NOTIFICATIONS_GUILD_SEND,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleGuildNotification(data: DiscordGuildNotificationEventDto) {
    await this.botNotificationsService.sendGuildNotification(data);
  }
}
