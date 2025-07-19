import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateGuildDto } from 'src/guilds/dto/create-guild.dto';
import { Queue } from 'src/enum/queue.enum';
import { GuildsService } from 'src/guilds/guilds.service';
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RetryService } from 'src/rabbitmq/retry.service';
import { RoutingKey } from 'src/enum/routing-key.enum';

@Injectable()
export class GuildsEventsHandler {
  constructor(
    private readonly guildsService: GuildsService,
    private readonly retryService: RetryService,
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
  async handleGuildsCreate(data: CreateGuildDto, amqpMsg: any) {
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
    console.log(`Guild created successfully: ${data.guildId}`);
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
    console.warn(
      'Guild CREATE DLQ message - manual intervention needed:',
      message,
    );
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
    console.warn(
      'Guild UPDATE DLQ message - manual intervention needed:',
      message,
    );
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
    console.warn(
      'Guild DELETE DLQ message - manual intervention needed:',
      message,
    );
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
  async handleGuildsUpdate(data: CreateGuildDto, amqpMsg: any) {
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
    console.log(`Guild updated successfully: ${data.guildId}`);
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
  async handleGuildsDelete(data: CreateGuildDto, amqpMsg: any) {
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
    console.log(`Guild deleted successfully: ${data.guildId}`);
  }
}
