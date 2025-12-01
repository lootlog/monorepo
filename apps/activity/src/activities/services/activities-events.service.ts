import {
  MessageHandlerErrorBehavior,
  RabbitPayload,
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
import { ActivitiesService } from 'src/activities/activities.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

@Injectable()
export class ActivitiesEventsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
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
  async handleActivityCreate(
    @RabbitPayload() data: unknown,
    amqpMsg: AmqpMessage,
  ) {
    const dto = plainToInstance(CreateActivityDto, data);
    const validationErrors = await validate(dto);

    if (validationErrors.length > 0) {
      this.logger.error({
        level: 'error',
        message:
          'Invalid activity payload - validation failed (permanent error, sending to DLQ)',
        rawPayload: data,
        validationErrors: validationErrors.map((err) => ({
          property: err.property,
          constraints: err.constraints,
          value: err.value,
        })),
      });

      // Don't throw - validation errors are permanent and should not be retried
      // Message will be ACKed and removed from queue
      // For manual intervention, send to DLQ directly
      await this.retryService.sendToDlq(
        data,
        RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
        {
          'x-validation-error': 'Validation failed',
          'x-error-type': 'permanent',
        },
      );

      return;
    }

    const headers = amqpMsg?.properties.headers ?? {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      dto,
      headers,
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      `activity create. discordId: ${dto.discordId}, userId: ${dto.userId}`,
    );

    if (!shouldContinue) {
      return;
    }

    try {
      const activity = await this.activitiesService.create(dto);

      this.logger.log({
        level: 'info',
        message: 'Activity created successfully',
        activityId: activity.id,
        userId: dto.userId,
        guildId: dto.guildId,
        type: dto.type,
      });
    } catch (error) {
      this.logger.error({
        level: 'error',
        message: 'Failed to create activity',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: dto?.userId,
        guildId: dto?.guildId,
        payload: data,
      });

      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
    queue: Queue.ACTIVITY_LOG_CREATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleActivityCreateDlq(@RabbitPayload() message: unknown) {
    this.logger.log({
      level: 'warn',
      message: 'Activity CREATE DLQ message - manual intervention needed',
      rawPayload: message,
    });
  }
}
