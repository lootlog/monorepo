import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import type { CreateGuildDto } from 'src/guilds/dto/create-guild.dto';
import { Queue } from 'src/enum/queue.enum';
import { GuildsService } from 'src/guilds/guilds.service';
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RetryService } from 'src/rabbitmq/retry.service';
import { RoutingKey } from 'src/enum/routing-key.enum';

interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

@Injectable()
export class GuildsEventsHandler {
  constructor(
    private readonly guildsService: GuildsService,
    private readonly retryService: RetryService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_CREATE,
    queue: Queue.GUILDS_CREATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_CREATE_RETRY,
    },
  })
  async handleGuildsCreate(data: CreateGuildDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers || {};

    // RetryService obsługuje całą logikę retry/DLQ
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_CREATE_DLQ,
      `guild create: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return; // Wiadomość została wysłana do DLQ
    }

    // Główna logika biznesowa
    await this.guildsService.createGuild(data);
    this.logger.log({
      level: 'info',
      message: 'Guild created successfully',
      guildId: data.guildId,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_CREATE_DLQ,
    queue: Queue.GUILDS_CREATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleGuildCreateDlq(message: CreateGuildDto) {
    this.logger.log({
      level: 'warn',
      message: 'Guild CREATE DLQ message - manual intervention needed',
      guildId: message.guildId,
      data: message,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_UPDATE_DLQ,
    queue: Queue.GUILDS_UPDATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleGuildUpdateDlq(message: CreateGuildDto) {
    this.logger.log({
      level: 'warn',
      message: 'Guild UPDATE DLQ message - manual intervention needed',
      guildId: message.guildId,
      data: message,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_DELETE_DLQ,
    queue: Queue.GUILDS_DELETE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleGuildDeleteDlq(message: CreateGuildDto) {
    this.logger.log({
      level: 'warn',
      message: 'Guild DELETE DLQ message - manual intervention needed',
      guildId: message.guildId,
      data: message,
    });
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_UPDATE,
    queue: Queue.GUILDS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_UPDATE_RETRY,
    },
  })
  async handleGuildsUpdate(data: CreateGuildDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers || {};

    // RetryService obsługuje całą logikę retry/DLQ
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_UPDATE_DLQ,
      `guild update: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return; // Wiadomość została wysłana do DLQ
    }

    // Główna logika biznesowa
    await this.guildsService.updateGuild(data);
    this.logger.log({
      level: 'info',
      message: 'Guild updated successfully',
      guildId: data.guildId,
    });
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_DELETE,
    queue: Queue.GUILDS_DELETE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_DELETE_RETRY,
    },
  })
  async handleGuildsDelete(data: CreateGuildDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers || {};

    // RetryService obsługuje całą logikę retry/DLQ
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_DELETE_DLQ,
      `guild delete: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return; // Wiadomość została wysłana do DLQ
    }

    // Główna logika biznesowa
    await this.guildsService.deleteGuild(data);
    this.logger.log({
      level: 'info',
      message: 'Guild deleted successfully',
      guildId: data.guildId,
    });
  }
}
