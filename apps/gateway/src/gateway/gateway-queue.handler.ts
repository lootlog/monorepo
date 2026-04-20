import type { AddMemberRoleDto } from "./dto/add-member-role.dto.js";
import type { AddMemberDto } from "./dto/add-member.dto.js";
import type { CreateTimerDto } from "./dto/create-timer.dto.js";
import type { DeleteMemberRoleDto } from "./dto/delete-member-role.dto.js";
import type { DeleteMemberDto } from "./dto/delete-member.dto.js";
import type { DeleteTimerDto } from "./dto/delete-timer.dto.js";
import type { RefreshJobUpdateDto } from "./dto/refresh-job-update.dto.js";
import type {
  ReservationCreateEventDto,
  ReservationDeleteEventDto,
} from "./dto/reservation-event.dto.js";
import type { SendMessageDto } from "./dto/send-message.dto.js";
import type { SendNotificationDto } from "./dto/send-notification.dto.js";
import type { SendPartyGatheringDto } from "./dto/send-party-gathering.dto.js";
import type { VolunteerNotificationDto } from "./dto/volunteer-notification.dto.js";
import { RoutingKey } from "./enums/routing-key.enum.js";
import { GatewayService } from "./gateway.service.js";
import { RetryService } from "./retry.service.js";
import type {
  EventHeroKilledPayload,
  EventMapStatusUpdatePayload,
  EventRankingUpdatePayload,
  EventRespawnWindowPayload,
} from "./types/margo-event.types.js";

export interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

type LoggerLike = {
  error(message: string, meta?: Record<string, unknown>): void;
};

export class GatewayQueueHandler {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly retryService: RetryService,
    private readonly logger: LoggerLike,
  ) {}

  private logDlqMessage(kind: string, data: unknown, amqpMsg: AmqpMessage) {
    this.logger.error(`Message sent to DLQ - ${kind}`, {
      data,
      retryCount: this.retryService.getRetryCount(
        amqpMsg.properties.headers ?? {},
      ),
      headers: amqpMsg.properties.headers,
    });
  }

  async handleGuildsTimerUpdate(data: CreateTimerDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_TIMERS_UPDATE_DLQ,
      `timer update: ${data.guildId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleGuildsTimerUpdate(data);
    }
  }

  async handleGuildsTimerDelete(data: DeleteTimerDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_TIMERS_DELETE_DLQ,
      `timer delete: ${data.guildId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleGuildsTimerDelete(data);
    }
  }

  async handleGuildsReservationCreate(
    data: ReservationCreateEventDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_RESERVATIONS_CREATE_DLQ,
      `reservation create: ${data.guildId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleGuildsReservationCreate(data);
    }
  }

  async handleGuildsReservationDelete(
    data: ReservationDeleteEventDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_RESERVATIONS_DELETE_DLQ,
      `reservation delete: ${data.guildId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleGuildsReservationDelete(data);
    }
  }

  async handleGuildMessageSend(data: SendMessageDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_SEND_MESSAGE_DLQ,
      `send message: ${data.guildId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleGuildMessageSend(data);
    }
  }

  async handleAddMember(data: AddMemberDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_ADD_DLQ,
      `member add cache invalidation: ${data.id}`,
    );

    if (shouldContinue) {
      await this.gatewayService.invalidatePlayerCache(data.id);
    }
  }

  async handleUpdateMember(data: AddMemberDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_UPDATE_DLQ,
      `member permissions update: ${data.discordId}`,
    );

    if (shouldContinue) {
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
    }
  }

  async handleDeleteMember(data: DeleteMemberDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
      `member remove cache invalidation: ${data.id}`,
    );

    if (shouldContinue) {
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
    }
  }

  async handleAddMemberRole(data: AddMemberRoleDto, amqpMsg: AmqpMessage) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_ADD_ROLE_DLQ,
      `member add role cache invalidation: ${data.id}`,
    );

    if (shouldContinue) {
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
    }
  }

  async handleDeleteMemberRole(
    data: DeleteMemberRoleDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_ROLE_DLQ,
      `member remove role cache invalidation: ${data.id}`,
    );

    if (shouldContinue) {
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
    }
  }

  async handleSendNotification(
    data: SendNotificationDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND_DLQ,
      `send notification: ${data.guildId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleGuildNotificationSend(data);
    }
  }

  handleTimerUpdateDLQ(data: CreateTimerDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Timer Update", data, amqpMsg);
  }

  handleTimerDeleteDLQ(data: DeleteTimerDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Timer Delete", data, amqpMsg);
  }

  handleReservationCreateDLQ(
    data: ReservationCreateEventDto,
    amqpMsg: AmqpMessage,
  ) {
    this.logDlqMessage("Reservation Create", data, amqpMsg);
  }

  handleReservationDeleteDLQ(
    data: ReservationDeleteEventDto,
    amqpMsg: AmqpMessage,
  ) {
    this.logDlqMessage("Reservation Delete", data, amqpMsg);
  }

  handleSendMessageDLQ(data: SendMessageDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Send Message", data, amqpMsg);
  }

  handleAddMemberDLQ(data: AddMemberDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Add Member Cache Invalidation", data, amqpMsg);
  }

  handleUpdateMemberDLQ(data: AddMemberDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Update Member Cache Invalidation", data, amqpMsg);
  }

  handleDeleteMemberDLQ(data: DeleteMemberDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Delete Member Cache Invalidation", data, amqpMsg);
  }

  handleAddMemberRoleDLQ(data: AddMemberRoleDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Add Member Role Cache Invalidation", data, amqpMsg);
  }

  handleDeleteMemberRoleDLQ(data: DeleteMemberRoleDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Delete Member Role Cache Invalidation", data, amqpMsg);
  }

  handleSendNotificationDLQ(data: SendNotificationDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Send Notification", data, amqpMsg);
  }

  async handleVolunteerNotification(
    data: VolunteerNotificationDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER_DLQ,
      `volunteer notification: ${data.notificationId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handleVolunteerNotification(data);
    }
  }

  handleVolunteerNotificationDLQ(
    data: VolunteerNotificationDto,
    amqpMsg: AmqpMessage,
  ) {
    this.logDlqMessage("Volunteer Notification", data, amqpMsg);
  }

  async handlePartyGathering(
    data: SendPartyGatheringDto,
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      data,
      headers,
      RoutingKey.GUILDS_PARTY_GATHERING_DLQ,
      `party gathering: ${data.notificationId}`,
    );

    if (shouldContinue) {
      await this.gatewayService.handlePartyGatheringSend(data);
    }
  }

  handlePartyGatheringDLQ(data: SendPartyGatheringDto, amqpMsg: AmqpMessage) {
    this.logDlqMessage("Party Gathering", data, amqpMsg);
  }

  async handlePartyGatheringCancel(data: {
    guildId: string;
    notificationId: string;
  }) {
    await this.gatewayService.handlePartyGatheringCancel(data);
  }

  async handleUpdateMessage(data: {
    guildId: string;
    messageId: string;
    message: string;
    routing: {
      tier: "base" | "titans" | "heroes";
      npcLevel?: number;
    };
  }) {
    await this.gatewayService.handleChatMessageUpdate(data);
  }

  async handleDeleteMessage(data: {
    guildId: string;
    messageId: string;
    routing: {
      tier: "base" | "titans" | "heroes";
      npcLevel?: number;
    };
  }) {
    await this.gatewayService.handleChatMessageDelete(data);
  }

  async handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    await this.gatewayService.handleMembersRefreshJobUpdate(data);
  }

  async handleEventMapStatusUpdate(data: EventMapStatusUpdatePayload) {
    this.gatewayService.handleEventMapStatusUpdate(data);
  }

  async handleEventHeroKilled(data: EventHeroKilledPayload) {
    this.gatewayService.handleEventHeroKilled(data);
  }

  async handleEventRankingUpdate(data: EventRankingUpdatePayload) {
    this.gatewayService.handleEventRankingUpdate(data);
  }

  async handleEventRespawnWindowOpened(data: EventRespawnWindowPayload) {
    this.gatewayService.handleEventRespawnWindowOpened(data);
  }

  async handleEventRespawnWindowClosed(data: EventRespawnWindowPayload) {
    this.gatewayService.handleEventRespawnWindowClosed(data);
  }

  async handlePresenceCheckRequest(data: { guildId: string; mapName: string }) {
    await this.gatewayService.checkPresenceForMap(data.guildId, data.mapName);
  }
}
