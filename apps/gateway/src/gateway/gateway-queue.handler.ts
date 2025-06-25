import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { AddMemberRoleDto } from 'src/gateway/dto/add-member-role.dto';
import { AddMemberDto } from 'src/gateway/dto/add-member.dto';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { DeleteMemberRoleDto } from 'src/gateway/dto/delete-member-role.dto';
import { DeleteMemberDto } from 'src/gateway/dto/delete-member.dto';
import { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { Queue } from 'src/gateway/enums/queue.enum';
import { RoutingKey } from 'src/gateway/enums/routing-key.enum';
import { GatewayService } from 'src/gateway/gateway.service';
import {
  DEFAULT_EXCHANGE_NAME,
  DEAD_LETTER_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RetryService } from 'src/gateway/retry.service';

@Injectable()
export class GatewayQueueHandler {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly retryService: RetryService,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
    queue: Queue.GUILDS_TIMERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_TIMERS_UPDATE_RETRY,
    },
  })
  async handleGuildsTimerUpdate(data: CreateTimerDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
      `timer update: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.handleGuildsTimerUpdate(data);
    console.log(`Timer updated successfully for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_TIMERS_DELETE,
    queue: Queue.GUILDS_TIMERS_DELETE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_TIMERS_DELETE_RETRY,
    },
  })
  async handleGuildsTimerDelete(data: DeleteTimerDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_TIMERS_DELETE_DLQ,
      `timer delete: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.handleGuildsTimerDelete(data);
    console.log(`Timer deleted successfully for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_SEND_MESSAGE,
    queue: Queue.GUILDS_SEND_MESSAGE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_SEND_MESSAGE_RETRY,
    },
  })
  async handleGuildMessageSend(data: SendMessageDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_SEND_MESSAGE_DLQ,
      `send message: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.handleGuildMessageSend(data);
    console.log(`Message sent successfully for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD,
    queue: Queue.GUILDS_MEMBERS_ADD,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_RETRY,
    },
  })
  async handleAddMember(data: AddMemberDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
      `member add cache invalidation: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.invalidatePlayerCache(data.id);
    console.log(`Member cache invalidated successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE,
    queue: Queue.GUILDS_MEMBERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_RETRY,
    },
  })
  async handleUpdateMember(data: AddMemberDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
      `member update cache invalidation: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.invalidatePlayerCache(data.id);
    console.log(`Member cache invalidated successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
    queue: Queue.GUILDS_MEMBERS_REMOVE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
    },
  })
  async handleDeleteMember(data: DeleteMemberDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
      `member remove cache invalidation: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.invalidatePlayerCache(data.id);
    console.log(`Member cache invalidated successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_RETRY,
    },
  })
  async handleAddMemberRole(data: AddMemberRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
      `member add role cache invalidation: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.invalidatePlayerCache(data.id);
    console.log(`Member cache invalidated successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_RETRY,
    },
  })
  async handleDeleteMemberRole(data: DeleteMemberRoleDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
      `member remove role cache invalidation: ${data.id}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.invalidatePlayerCache(data.id);
    console.log(`Member cache invalidated successfully: ${data.id}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND,
    queue: Queue.GUILDS_SEND_NOTIFICATION,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND_RETRY,
    },
  })
  async handleSendNotification(data: SendNotificationDto, amqpMsg: any) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
      `send notification: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.handleGuildNotificationSend(data);
    console.log(`Notification sent successfully for guild: ${data.guildId}`);
  }

  // DLQ Handlers
  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
    queue: Queue.GUILDS_TIMERS_UPDATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleTimerUpdateDLQ(data: CreateTimerDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Timer Update:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_TIMERS_DELETE_DLQ,
    queue: Queue.GUILDS_TIMERS_DELETE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleTimerDeleteDLQ(data: DeleteTimerDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Timer Delete:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_SEND_MESSAGE_DLQ,
    queue: Queue.GUILDS_SEND_MESSAGE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleSendMessageDLQ(data: SendMessageDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Send Message:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
    queue: Queue.GUILDS_MEMBERS_ADD_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleAddMemberDLQ(data: AddMemberDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Add Member Cache Invalidation:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
    queue: Queue.GUILDS_MEMBERS_UPDATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleUpdateMemberDLQ(data: AddMemberDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Update Member Cache Invalidation:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleDeleteMemberDLQ(data: DeleteMemberDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Delete Member Cache Invalidation:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleAddMemberRoleDLQ(data: AddMemberRoleDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Add Member Role Cache Invalidation:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleDeleteMemberRoleDLQ(data: DeleteMemberRoleDto, amqpMsg: any) {
    console.error(
      'Message sent to DLQ - Delete Member Role Cache Invalidation:',
      {
        data,
        retryCount: this.retryService.getRetryCount(
          amqpMsg.properties.headers || {},
        ),
        headers: amqpMsg.properties.headers,
      },
    );
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
    queue: Queue.GUILDS_SEND_NOTIFICATION_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  async handleSendNotificationDLQ(data: SendNotificationDto, amqpMsg: any) {
    console.error('Message sent to DLQ - Send Notification:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }
}
