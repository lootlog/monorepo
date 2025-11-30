import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { Queue } from 'src/enum/queue.enum';
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { RetryService } from 'src/shared/rabbitmq/retry.service';
import { CreateActivityDto } from 'src/activities/dto/create-activity.dto';

interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

@Injectable()
export class ActivitiesEventsService {
  constructor(
    private readonly retryService: RetryService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.ACTIVITY_LOG_CREATE,
    queue: Queue.ACTIVITY_LOG_CREATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.ACTIVITY_LOG_CREATE_RETRY,
    },
  })
  async handleActivityCreate(data: CreateActivityDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      `activity create. discordId: ${data.discordId}, userId: ${data.userId}`,
    );

    if (!shouldContinue) {
      return;
    }

    console.log('Creating activity log for:', data);

    this.logger.log({
      level: 'info',
      message: 'Activity created successfully',
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
    queue: Queue.ACTIVITY_LOG_CREATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleActivityCreateDlq(message: CreateActivityDto) {
    this.logger.log({
      level: 'warn',
      message: 'Activity CREATE DLQ message - manual intervention needed',
      discordId: message.discordId,
      userId: message.userId,
      data: message,
    });
  }
}
