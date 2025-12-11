import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import type { AddMemberRoleDto } from 'src/gateway/dto/add-member-role.dto';
import type { AddMemberDto } from 'src/gateway/dto/add-member.dto';
import type { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import type { DeleteMemberRoleDto } from 'src/gateway/dto/delete-member-role.dto';
import type { DeleteMemberDto } from 'src/gateway/dto/delete-member.dto';
import type { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import type { RefreshJobUpdateDto } from 'src/gateway/dto/refresh-job-update.dto';
import type {
  ReservationCreateEventDto,
  ReservationDeleteEventDto,
} from 'src/gateway/dto/reservation-event.dto';
import type { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import type { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { Queue } from 'src/gateway/enums/queue.enum';
import { RoutingKey } from 'src/gateway/enums/routing-key.enum';
import { GatewayService } from 'src/gateway/gateway.service';
import {
  DEFAULT_EXCHANGE_NAME,
  DEAD_LETTER_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from 'src/config/rabbitmq.config';
import { RetryService } from 'src/gateway/retry.service';

interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

@Injectable()
export class GatewayQueueHandler {
  private readonly logger = new Logger(GatewayQueueHandler.name);

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
  async handleGuildsTimerUpdate(data: CreateTimerDto, amqpMsg: AmqpMessage) {
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
    this.logger.log(`Timer updated successfully for guild: ${data.guildId}`);
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
  async handleGuildsTimerDelete(data: DeleteTimerDto, amqpMsg: AmqpMessage) {
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
    this.logger.log(`Timer deleted successfully for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE,
    queue: Queue.GUILDS_RESERVATIONS_CREATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE_RETRY,
    },
  })
  async handleGuildsReservationCreate(
    data: ReservationCreateEventDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
      `reservation create: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.handleGuildsReservationCreate(data);
    this.logger.log(
      `Reservation created successfully for guild: ${data.guildId}`,
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE,
    queue: Queue.GUILDS_RESERVATIONS_DELETE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE_RETRY,
    },
  })
  async handleGuildsReservationDelete(
    data: ReservationDeleteEventDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
      `reservation delete: ${data.guildId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await this.gatewayService.handleGuildsReservationDelete(data);
    this.logger.log(
      `Reservation deleted successfully for guild: ${data.guildId}`,
    );
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
  async handleGuildMessageSend(data: SendMessageDto, amqpMsg: AmqpMessage) {
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
    this.logger.log(`Message sent successfully for guild: ${data.guildId}`);
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
  async handleAddMember(data: AddMemberDto, amqpMsg: AmqpMessage) {
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
    this.logger.log(`Member cache invalidated successfully: ${data.id}`);
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
  async handleUpdateMember(data: AddMemberDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers || {};

    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
      `member permissions update: ${data.discordId}`,
    );

    if (!shouldContinue) {
      return;
    }

    await Promise.all([
      this.gatewayService.invalidatePlayerCache(data.id),
      this.gatewayService.invalidateUserGuildsCache(
        data.discordId,
        data.userId,
      ),
      this.gatewayService.rebalanceUserSocketRooms(data.discordId, data.userId),
    ]);

    this.logger.log(
      `Member permissions updated for ${data.discordId} in guild ${data.guildId}`,
    );
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
  async handleDeleteMember(data: DeleteMemberDto, amqpMsg: AmqpMessage) {
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

    await Promise.all([
      this.gatewayService.invalidatePlayerCache(data.id),
      this.gatewayService.invalidateUserGuildsCache(
        data.discordId,
        data.userId,
      ),
      this.gatewayService.rebalanceUserSocketRooms(data.discordId, data.userId),
    ]);

    this.logger.log(
      `Member removed and rooms rebalanced for ${data.discordId} in guild ${data.guildId}`,
    );
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
  async handleAddMemberRole(data: AddMemberRoleDto, amqpMsg: AmqpMessage) {
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

    await Promise.all([
      this.gatewayService.invalidatePlayerCache(data.id),
      this.gatewayService.invalidateUserGuildsCache(
        data.discordId,
        data.userId,
      ),
      this.gatewayService.rebalanceUserSocketRooms(data.discordId, data.userId),
    ]);

    this.logger.log(
      `Member role added and rooms rebalanced for ${data.discordId} in guild ${data.guildId}`,
    );
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
  async handleDeleteMemberRole(
    data: DeleteMemberRoleDto,
    amqpMsg: AmqpMessage,
  ) {
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

    await Promise.all([
      this.gatewayService.invalidatePlayerCache(data.id),
      this.gatewayService.invalidateUserGuildsCache(
        data.discordId,
        data.userId,
      ),
      this.gatewayService.rebalanceUserSocketRooms(data.discordId, data.userId),
    ]);

    this.logger.log(
      `Member role removed and rooms rebalanced for ${data.discordId} in guild ${data.guildId}`,
    );
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
  async handleSendNotification(
    data: SendNotificationDto,
    amqpMsg: AmqpMessage,
  ) {
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
    this.logger.log(
      `Notification sent successfully for guild: ${data.guildId}`,
    );
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
  handleTimerUpdateDLQ(data: CreateTimerDto, amqpMsg: AmqpMessage) {
    this.logger.error('Message sent to DLQ - Timer Update:', {
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
  handleTimerDeleteDLQ(data: DeleteTimerDto, amqpMsg: AmqpMessage) {
    this.logger.error('Message sent to DLQ - Timer Delete:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
    queue: Queue.GUILDS_RESERVATIONS_CREATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleReservationCreateDLQ(
    data: ReservationCreateEventDto,
    amqpMsg: AmqpMessage,
  ) {
    this.logger.error('Message sent to DLQ - Reservation Create:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
    queue: Queue.GUILDS_RESERVATIONS_DELETE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleReservationDeleteDLQ(
    data: ReservationDeleteEventDto,
    amqpMsg: AmqpMessage,
  ) {
    this.logger.error('Message sent to DLQ - Reservation Delete:', {
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
  handleSendMessageDLQ(data: SendMessageDto, amqpMsg: AmqpMessage) {
    this.logger.error('Message sent to DLQ - Send Message:', {
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
  handleAddMemberDLQ(data: AddMemberDto, amqpMsg: AmqpMessage) {
    this.logger.error('Message sent to DLQ - Add Member Cache Invalidation:', {
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
  handleUpdateMemberDLQ(data: AddMemberDto, amqpMsg: AmqpMessage) {
    this.logger.error(
      'Message sent to DLQ - Update Member Cache Invalidation:',
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
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleDeleteMemberDLQ(data: DeleteMemberDto, amqpMsg: AmqpMessage) {
    this.logger.error(
      'Message sent to DLQ - Delete Member Cache Invalidation:',
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
    routingKey: RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    queue: Queue.GUILDS_MEMBERS_ADD_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleAddMemberRoleDLQ(data: AddMemberRoleDto, amqpMsg: AmqpMessage) {
    this.logger.error(
      'Message sent to DLQ - Add Member Role Cache Invalidation:',
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
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleDeleteMemberRoleDLQ(data: DeleteMemberRoleDto, amqpMsg: AmqpMessage) {
    this.logger.error(
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
  handleSendNotificationDLQ(data: SendNotificationDto, amqpMsg: AmqpMessage) {
    this.logger.error('Message sent to DLQ - Send Notification:', {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers || {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
    queue: Queue.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    await this.gatewayService.handleMembersRefreshJobUpdate(data);
    this.logger.log(
      `Member refresh job update sent for guild: ${data.guildId}, status: ${data.status}`,
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_PRESENCE_UPDATE,
    queue: Queue.EVENT_PRESENCE_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleEventPresenceUpdate(data: {
    guildId: string;
    eventId: string;
    mapId: string;
    presenceLog: any;
  }) {
    this.gatewayService.handleEventPresenceUpdate(data);
    this.logger.log(`Margo event presence update for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_MAP_STATUS_UPDATE,
    queue: Queue.EVENT_MAP_STATUS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleEventMapStatusUpdate(data: {
    guildId: string;
    eventId: string;
    mapId: string;
    mapName: string;
  }) {
    this.gatewayService.handleEventMapStatusUpdate(data);

    // Check if any players are already on this map and publish presence check
    await this.gatewayService.checkPresenceForMap(data.guildId, data.mapName);

    this.logger.log(`Margo event map status update for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_HERO_KILLED,
    queue: Queue.EVENT_HERO_KILLED,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleEventHeroKilled(data: {
    guildId: string;
    eventId: string;
    heroNpcId: string;
    kill: any;
  }) {
    this.gatewayService.handleEventHeroKilled(data);
    this.logger.log(`Margo event hero killed for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_RANKING_UPDATE,
    queue: Queue.EVENT_RANKING_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleEventRankingUpdate(data: {
    guildId: string;
    eventId: string;
    rankings: any;
  }) {
    this.gatewayService.handleEventRankingUpdate(data);
    this.logger.log(`Margo event ranking update for guild: ${data.guildId}`);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
    queue: Queue.EVENT_RESPAWN_WINDOW_OPENED,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleEventRespawnWindowOpened(data: {
    guildId: string;
    eventId: string;
    heroId: string;
  }) {
    this.gatewayService.handleEventRespawnWindowOpened(data);
    this.logger.log(
      `Margo event respawn window opened for guild: ${data.guildId}`,
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
    queue: Queue.EVENT_RESPAWN_WINDOW_CLOSED,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleEventRespawnWindowClosed(data: {
    guildId: string;
    eventId: string;
    heroId: string;
  }) {
    this.gatewayService.handleEventRespawnWindowClosed(data);
    this.logger.log(
      `Margo event respawn window closed for guild: ${data.guildId}`,
    );
  }
}
