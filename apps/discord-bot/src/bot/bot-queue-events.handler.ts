import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { BotService } from 'src/bot/bot.service';
import { InitializeGuildBotDto } from 'src/bot/dto/initialize-guild-bot.dto';
import { Queue } from 'src/bot/enums/queue.enum';
import { RoutingKey } from 'src/bot/enums/routing-key.enum';

@Injectable()
export class BotQueueEventsHandler {
  private readonly logger = new Logger(BotQueueEventsHandler.name);

  constructor(private readonly botService: BotService) {}
}
