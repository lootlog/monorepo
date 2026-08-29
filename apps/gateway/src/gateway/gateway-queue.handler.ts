import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import type { AddMemberRoleDto } from "src/gateway/dto/add-member-role.dto";
import type { AddMemberDto } from "src/gateway/dto/add-member.dto";
import type { ChatMessageDeleteDto } from "src/gateway/dto/chat-message-delete.dto";
import type { ChatMessagesClearDto } from "src/gateway/dto/chat-messages-clear.dto";
import type { ChatMessageUpdateDto } from "src/gateway/dto/chat-message-update.dto";
import type { CreateTimerDto } from "src/gateway/dto/create-timer.dto";
import type { DeleteMemberRoleDto } from "src/gateway/dto/delete-member-role.dto";
import type { DeleteMemberDto } from "src/gateway/dto/delete-member.dto";
import type { DeleteTimerDto } from "src/gateway/dto/delete-timer.dto";
import {
  LootCreateEventV2Dto,
  LootShareUpdateEventV2Dto,
} from "src/gateway/dto/loot-event.dto";
import type { RefreshJobUpdateDto } from "src/gateway/dto/refresh-job-update.dto";
import {
  ReservationChangedEventV2Dto,
  type ReservationCreateEventDto,
  type ReservationDeleteEventDto,
} from "src/gateway/dto/reservation-event.dto";
import type { SendMessageDto } from "src/gateway/dto/send-message.dto";
import type { SendNotificationDto } from "src/gateway/dto/send-notification.dto";
import type { SendPartyGatheringDto } from "src/gateway/dto/send-party-gathering.dto";
import type { VolunteerNotificationDto } from "src/gateway/dto/volunteer-notification.dto";
import { parsePartyReadyRoomUpdateEnvelope } from "src/gateway/dto/party-ready-room-update.dto";
import type {
  EventMapStatusUpdatePayload,
  EventHeroKilledPayload,
  EventRankingUpdatePayload,
  EventRespawnWindowPayload,
} from "src/gateway/types/margo-event.types";
import { Queue } from "src/gateway/enums/queue.enum";
import { RoutingKey } from "src/gateway/enums/routing-key.enum";
import { GatewayService } from "src/gateway/gateway.service";
import {
  DEFAULT_EXCHANGE_NAME,
  DEAD_LETTER_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from "src/config/rabbitmq.config";
import { RetryService } from "src/gateway/retry.service";

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

  private async handleWithRetry<TPayload>(
    data: TPayload,
    amqpMsg: AmqpMessage,
    dlqRoutingKey: RoutingKey,
    identifier: string,
    handler: () => Promise<void> | void,
  ) {
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      amqpMsg.properties.headers ?? {},
      dlqRoutingKey,
      identifier,
    );

    if (!shouldContinue) {
      return;
    }

    await handler();
  }

  private logDeadLetterMessage<TPayload>(
    label: string,
    data: TPayload,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};

    this.logger.error(`Message sent to DLQ - ${label}:`, {
      data,
      retryCount: this.retryService.getRetryCount(headers),
      headers,
    });
  }

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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
      `timer update: ${data.guildId}`,
      () => this.gatewayService.handleGuildsTimerUpdate(data),
    );
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_TIMERS_DELETE_DLQ,
      `timer delete: ${data.guildId}`,
      () => this.gatewayService.handleGuildsTimerDelete(data),
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_LOOTS_CREATE,
    queue: Queue.GUILDS_LOOTS_CREATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_LOOTS_CREATE_RETRY,
    },
  })
  async handleGuildsLootCreate(rawData: unknown, amqpMsg: AmqpMessage) {
    const result = LootCreateEventV2Dto.schema.safeParse(rawData);
    if (!result.success) {
      await this.handleWithRetry(
        rawData,
        amqpMsg,
        RoutingKey.GUILDS_LOOTS_CREATE_DLQ,
        "invalid loot create v2",
        () => {
          throw result.error;
        },
      );
      return;
    }

    const data: LootCreateEventV2Dto = result.data;
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_LOOTS_CREATE_DLQ,
      `loot create: ${data.guildId}:${data.lootId}`,
      () => this.gatewayService.handleGuildsLootCreate(data),
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
    queue: Queue.GUILDS_LOOTS_SHARE_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_LOOTS_SHARE_UPDATE_RETRY,
    },
  })
  async handleGuildsLootShareUpdate(rawData: unknown, amqpMsg: AmqpMessage) {
    const result = LootShareUpdateEventV2Dto.schema.safeParse(rawData);
    if (!result.success) {
      await this.handleWithRetry(
        rawData,
        amqpMsg,
        RoutingKey.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
        "invalid loot share update v2",
        () => {
          throw result.error;
        },
      );
      return;
    }

    const data: LootShareUpdateEventV2Dto = result.data;
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
      `loot share update: ${data.guildId}:${data.lootId}`,
      () => this.gatewayService.handleGuildsLootShareUpdate(data),
    );
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
      `reservation create: ${data.guildId}`,
      () => this.gatewayService.handleGuildsReservationCreate(data),
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
      `reservation delete: ${data.guildId}`,
      () => this.gatewayService.handleGuildsReservationDelete(data),
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2,
    queue: Queue.GUILDS_RESERVATIONS_CHANGED_V2,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_RETRY,
    },
  })
  async handleGuildsReservationChangedV2(
    rawData: unknown,
    amqpMsg: AmqpMessage,
  ) {
    const result = ReservationChangedEventV2Dto.schema.safeParse(rawData);
    if (!result.success) {
      await this.handleWithRetry(
        rawData,
        amqpMsg,
        RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
        "invalid reservation v2 change",
        () => {
          throw result.error;
        },
      );
      return;
    }

    const data = result.data;
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
      `reservation v2 change: ${data.sourceGuildId}`,
      () => this.gatewayService.handleGuildsReservationChangedV2(data),
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_SEND_MESSAGE_DLQ,
      `send message: ${data.guildId}`,
      () => this.gatewayService.handleGuildMessageSend(data),
    );
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
      `member add cache invalidation: ${data.id}`,
      () => this.gatewayService.invalidatePlayerCache(data.id),
    );
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
      `member permissions update: ${data.discordId}`,
      async () => {
        await Promise.all([
          this.gatewayService.invalidatePlayerCache(data.id),
          this.gatewayService.invalidateUserGuildsCache(
            data.discordId,
            data.userId,
          ),
          this.gatewayService.rebalanceUserSocketRooms(
            data.discordId,
            data.userId,
          ),
        ]);
      },
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
      `member remove cache invalidation: ${data.id}`,
      async () => {
        await Promise.all([
          this.gatewayService.invalidatePlayerCache(data.id),
          this.gatewayService.invalidateUserGuildsCache(
            data.discordId,
            data.userId,
          ),
          this.gatewayService.rebalanceUserSocketRooms(
            data.discordId,
            data.userId,
          ),
        ]);
      },
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
      `member add role cache invalidation: ${data.id}`,
      async () => {
        await Promise.all([
          this.gatewayService.invalidatePlayerCache(data.id),
          this.gatewayService.invalidateUserGuildsCache(
            data.discordId,
            data.userId,
          ),
          this.gatewayService.rebalanceUserSocketRooms(
            data.discordId,
            data.userId,
          ),
        ]);
      },
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
      `member remove role cache invalidation: ${data.id}`,
      async () => {
        await Promise.all([
          this.gatewayService.invalidatePlayerCache(data.id),
          this.gatewayService.invalidateUserGuildsCache(
            data.discordId,
            data.userId,
          ),
          this.gatewayService.rebalanceUserSocketRooms(
            data.discordId,
            data.userId,
          ),
        ]);
      },
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
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
      `send notification: ${data.guildId}`,
      () => this.gatewayService.handleGuildNotificationSend(data),
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
    this.logDeadLetterMessage("Timer Update", data, amqpMsg);
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
    this.logDeadLetterMessage("Timer Delete", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_LOOTS_CREATE_DLQ,
    queue: Queue.GUILDS_LOOTS_CREATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleLootCreateDLQ(data: LootCreateEventV2Dto, amqpMsg: AmqpMessage) {
    this.logDeadLetterMessage("Loot Create", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
    queue: Queue.GUILDS_LOOTS_SHARE_UPDATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleLootShareUpdateDLQ(
    data: LootShareUpdateEventV2Dto,
    amqpMsg: AmqpMessage,
  ) {
    this.logDeadLetterMessage("Loot Share Update", data, amqpMsg);
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
    this.logDeadLetterMessage("Reservation Create", data, amqpMsg);
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
    this.logDeadLetterMessage("Reservation Delete", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
    queue: Queue.GUILDS_RESERVATIONS_CHANGED_V2_DLQ,
    queueOptions: { durable: true },
  })
  handleReservationChangedV2DLQ(rawData: unknown, amqpMsg: AmqpMessage) {
    this.logDeadLetterMessage("Reservation V2 Change", rawData, amqpMsg);
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
    this.logDeadLetterMessage("Send Message", data, amqpMsg);
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
    this.logDeadLetterMessage("Add Member Cache Invalidation", data, amqpMsg);
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
    this.logDeadLetterMessage(
      "Update Member Cache Invalidation",
      data,
      amqpMsg,
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
    this.logDeadLetterMessage(
      "Delete Member Cache Invalidation",
      data,
      amqpMsg,
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
    this.logDeadLetterMessage(
      "Add Member Role Cache Invalidation",
      data,
      amqpMsg,
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
    this.logDeadLetterMessage(
      "Delete Member Role Cache Invalidation",
      data,
      amqpMsg,
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
    this.logDeadLetterMessage("Send Notification", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
    queue: Queue.GUILDS_NOTIFICATIONS_VOLUNTEER,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_RETRY,
    },
  })
  async handleVolunteerNotification(
    data: VolunteerNotificationDto,
    amqpMsg: AmqpMessage,
  ) {
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
      `volunteer notification: ${data.notificationId}`,
      () => this.gatewayService.handleVolunteerNotification(data),
    );
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
    queue: Queue.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleVolunteerNotificationDLQ(
    data: VolunteerNotificationDto,
    amqpMsg: AmqpMessage,
  ) {
    this.logDeadLetterMessage("Volunteer Notification", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.USERS_PARTY_READY_ROOM_UPDATED,
    queue: Queue.USERS_PARTY_READY_ROOM_UPDATED,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.USERS_PARTY_READY_ROOM_UPDATED_RETRY,
    },
  })
  async handlePartyReadyRoomUpdate(data: unknown, amqpMsg: AmqpMessage) {
    const envelope = parsePartyReadyRoomUpdateEnvelope(data);
    await this.handleWithRetry(
      envelope,
      amqpMsg,
      RoutingKey.USERS_PARTY_READY_ROOM_UPDATED_DLQ,
      `party ready room: ${
        envelope.update.type === "UPSERT"
          ? envelope.update.projection.notificationId
          : envelope.update.notificationId
      }:${envelope.recipientDiscordId}`,
      () => this.gatewayService.handlePartyReadyRoomUpdate(envelope),
    );
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.USERS_PARTY_READY_ROOM_UPDATED_DLQ,
    queue: Queue.USERS_PARTY_READY_ROOM_UPDATED_DLQ,
    queueOptions: { durable: true },
  })
  handlePartyReadyRoomUpdateDLQ(data: unknown, amqpMsg: AmqpMessage) {
    this.logDeadLetterMessage("Party Ready Room", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_PARTY_GATHERING,
    queue: Queue.GUILDS_PARTY_GATHERING,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_PARTY_GATHERING_RETRY,
    },
  })
  async handlePartyGathering(
    data: SendPartyGatheringDto,
    amqpMsg: AmqpMessage,
  ) {
    await this.handleWithRetry(
      data,
      amqpMsg,
      RoutingKey.GUILDS_PARTY_GATHERING_DLQ,
      `party gathering: ${data.notificationId}`,
      () => this.gatewayService.handlePartyGatheringSend(data),
    );
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_PARTY_GATHERING_DLQ,
    queue: Queue.GUILDS_PARTY_GATHERING_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handlePartyGatheringDLQ(data: SendPartyGatheringDto, amqpMsg: AmqpMessage) {
    this.logDeadLetterMessage("Party Gathering", data, amqpMsg);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
    queue: Queue.GUILDS_PARTY_GATHERING_CANCEL,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handlePartyGatheringCancel(data: {
    guildId: string;
    notificationId: string;
  }) {
    await this.gatewayService.handlePartyGatheringCancel(data);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_UPDATE_MESSAGE,
    queue: Queue.GUILDS_UPDATE_MESSAGE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleUpdateMessage(data: ChatMessageUpdateDto) {
    await this.gatewayService.handleChatMessageUpdate(data);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_DELETE_MESSAGE,
    queue: Queue.GUILDS_DELETE_MESSAGE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleDeleteMessage(data: ChatMessageDeleteDto) {
    await this.gatewayService.handleChatMessageDelete(data);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_CLEAR_MESSAGES,
    queue: Queue.GUILDS_CLEAR_MESSAGES,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handleClearMessages(data: ChatMessagesClearDto) {
    await this.gatewayService.handleChatMessagesClear(data);
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
  handleEventMapStatusUpdate(data: EventMapStatusUpdatePayload) {
    this.gatewayService.handleEventMapStatusUpdate(data);
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
  async handleEventHeroKilled(data: EventHeroKilledPayload) {
    this.gatewayService.handleEventHeroKilled(data);
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
  async handleEventRankingUpdate(data: EventRankingUpdatePayload) {
    this.gatewayService.handleEventRankingUpdate(data);
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
  async handleEventRespawnWindowOpened(data: EventRespawnWindowPayload) {
    this.gatewayService.handleEventRespawnWindowOpened(data);
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
  async handleEventRespawnWindowClosed(data: EventRespawnWindowPayload) {
    this.gatewayService.handleEventRespawnWindowClosed(data);
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.PRESENCE_CHECK_REQUEST,
    queue: Queue.PRESENCE_CHECK_REQUEST,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
    },
  })
  async handlePresenceCheckRequest(data: { guildId: string; mapName: string }) {
    await this.gatewayService.checkPresenceForMap(data.guildId, data.mapName);
  }
}
