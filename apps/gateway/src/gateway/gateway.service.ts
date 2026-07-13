import { Injectable, Logger } from "@nestjs/common";
import type { PartyReadyRoomUpdateEnvelope } from "@lootlog/types";
import { CreateTimerDto } from "src/gateway/dto/create-timer.dto";
import type { ChatMessageDeleteDto } from "src/gateway/dto/chat-message-delete.dto";
import type { ChatMessageEnvelopeDto } from "src/gateway/dto/chat-message-envelope.dto";
import type { ChatMessagesClearDto } from "src/gateway/dto/chat-messages-clear.dto";
import type { ChatMessageUpdateDto } from "src/gateway/dto/chat-message-update.dto";
import type { DeleteTimerDto } from "src/gateway/dto/delete-timer.dto";
import type {
  LootCreateEventDto,
  LootShareUpdateEventDto,
} from "src/gateway/dto/loot-event.dto";
import type { RefreshJobUpdateDto } from "src/gateway/dto/refresh-job-update.dto";
import type {
  ReservationCreateEventDto,
  ReservationDeleteEventDto,
} from "src/gateway/dto/reservation-event.dto";
import { MessageType, SendMessageDto } from "src/gateway/dto/send-message.dto";
import { SendNotificationDto } from "src/gateway/dto/send-notification.dto";
import type { SendPartyGatheringDto } from "src/gateway/dto/send-party-gathering.dto";
import type { VolunteerNotificationDto } from "src/gateway/dto/volunteer-notification.dto";
import { GatewayEvent } from "src/gateway/enums/gateway-event.enum";
import { Gateway } from "src/gateway/gateway";
import { isOwnerOrAdminFromRoles } from "src/guilds/utils/is-administrative-user";
import { RedisService } from "@lootlog/nest-shared/redis";
import { GuildsService } from "src/guilds/guilds.service";
import type { UserGuildData } from "src/guilds/types/guild.types";
import type {
  EventHeroKilledPayload,
  EventRankingUpdatePayload,
  EventRespawnWindowPayload,
  EventMapStatusUpdatePayload,
} from "src/gateway/types/margo-event.types";
import {
  buildRoomName,
  buildUserGuildRoomName,
  calculateUserRooms,
  getNpcTier,
  hasFeatureRoomAccess,
  type FeatureName,
  type TierName,
} from "src/gateway/utils/room-utils";
import { ActivityService } from "src/gateway/services/activity.service";
import { PresenceService } from "src/gateway/services/presence.service";
import { ActivityType } from "src/gateway/enums/activity-type.enum";
import type { Socket } from "src/gateway/types/socket-user.type";

type FetchedSocket = Awaited<
  ReturnType<Gateway["server"]["fetchSockets"]>
>[number];

type FeatureRouting = {
  tier: TierName;
  npcLevel?: number;
};

type RoutedDeleteTimerDto = DeleteTimerDto;

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly gateway: Gateway,
    private readonly redis: RedisService,
    private readonly guildsService: GuildsService,
    private readonly activityService: ActivityService,
    private readonly presenceService: PresenceService,
  ) {}

  handlePartyReadyRoomUpdate(data: PartyReadyRoomUpdateEnvelope) {
    const rooms = data.eligibleGuildIds.map((guildId) =>
      buildUserGuildRoomName(data.recipientDiscordId, guildId),
    );
    this.gateway.server
      .to(rooms)
      .emit(GatewayEvent.PARTY_READY_ROOM_UPDATE, data.projection);
  }

  private emitToFeatureRoom({
    guildId,
    feature,
    tier,
    event,
    data,
    npcLevel,
  }: {
    guildId: string;
    feature: FeatureName;
    tier: TierName;
    event: GatewayEvent;
    data: unknown;
    npcLevel?: number;
  }) {
    const room = buildRoomName(guildId, feature, tier);

    if (npcLevel !== undefined) {
      void this.fetchSocketsSafely(
        () => this.gateway.server.in(room).fetchSockets(),
        `feature room ${room}`,
      )
        .then((sockets) => {
          sockets.forEach((socket) => {
            const guildData = socket.data.guilds?.find(
              (g: UserGuildData) => g.guild.id === guildId,
            );
            if (!guildData) return;

            // Owner/Admin bypass level checks
            const isOwner = guildData.guild.ownerId === socket.data.discordId;
            if (isOwner || isOwnerOrAdminFromRoles(guildData.roles)) {
              socket.emit(event, data);
              return;
            }

            if (
              hasFeatureRoomAccess(guildData.roles, feature, tier, npcLevel)
            ) {
              socket.emit(event, data);
            }
          });
        })
        .catch((error) => {
          this.logger.error(
            `Failed to emit to feature room ${room}: ${error.message}`,
            error.stack,
          );
        });
    } else {
      this.gateway.server.to(room).emit(event, data);
    }
  }

  handleGuildsTimerUpdate(data: CreateTimerDto) {
    const routing = this.getNpcFeatureRouting(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "timers",
      tier: routing.tier,
      event: GatewayEvent.TIMERS_CREATE,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  handleGuildsTimerDelete(data: RoutedDeleteTimerDto) {
    const { routing, ...payload } = data;

    this.emitToFeatureRoom({
      guildId: payload.guildId,
      feature: "timers",
      tier: routing.tier,
      event: GatewayEvent.TIMERS_DELETE,
      data: payload,
      npcLevel: routing.npcLevel,
    });
  }

  handleGuildsLootCreate(data: LootCreateEventDto) {
    const routing = this.getNpcFeatureRouting(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "loots",
      tier: routing.tier,
      event: GatewayEvent.LOOTS_CREATE,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  handleGuildsLootShareUpdate(data: LootShareUpdateEventDto) {
    const routing = this.getNpcFeatureRouting(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "loots",
      tier: routing.tier,
      event: GatewayEvent.LOOTS_SHARE_UPDATE,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  handleGuildsReservationCreate(data: ReservationCreateEventDto) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.RESERVATIONS_CREATE, data);
  }

  handleGuildsReservationDelete(data: ReservationDeleteEventDto) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.RESERVATIONS_DELETE, data);
  }

  handleGuildMessageSend(data: SendMessageDto) {
    const routing = this.getChatMessageRouting(data);
    const room = buildRoomName(data.guildId, "chat", routing.tier);

    void this.fetchSocketsSafely(
      () => this.gateway.server.in(room).fetchSockets(),
      `chat room ${room}`,
    )
      .then((sockets) => {
        sockets.forEach((socket) => {
          const guildData = socket.data.guilds?.find(
            (guild) => guild.guild.id === data.guildId,
          );

          if (!guildData) {
            return;
          }

          const isOwner = guildData.guild.ownerId === socket.data.discordId;
          const isOwnerOrAdmin =
            isOwner || isOwnerOrAdminFromRoles(guildData.roles);

          if (
            routing.npcLevel !== undefined &&
            !isOwnerOrAdmin &&
            !hasFeatureRoomAccess(
              guildData.roles,
              "chat",
              routing.tier,
              routing.npcLevel,
            )
          ) {
            return;
          }

          socket.emit(
            GatewayEvent.CHAT_MESSAGE,
            this.toChatMessageEnvelope(
              data,
              socket.data.discordId,
              isOwnerOrAdmin,
            ),
          );
        });
      })
      .catch((error) => {
        this.logger.error(
          `Failed to send chat message for guild ${data.guildId}: ${error.message}`,
          error.stack,
        );
      });
  }

  handleGuildNotificationSend(data: SendNotificationDto) {
    const routing = this.getNpcFeatureRouting(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "notifications",
      tier: routing.tier,
      event: GatewayEvent.NOTIFICATIONS_SEND,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  async invalidatePlayerCache(discordId: string) {
    await this.redis.del(discordId);
  }

  handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    // Emit directly to admin room - only owner/admin are in this room
    const adminRoom = buildRoomName(data.guildId, "admin");
    this.gateway.server
      .to(adminRoom)
      .emit(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, data);
  }

  async invalidateUserGuildsCache(discordId: string, userId: string) {
    await this.guildsService.invalidateUserGuildsCache(discordId, userId);
  }

  async rebalanceUserSocketRooms(discordId: string, userId: string) {
    try {
      const defaultUpdatedGuilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });
      const sockets = await this.fetchSocketsSafely(
        () => this.gateway.server.fetchSockets(),
        `socket rebalance for user ${discordId}`,
      );
      const userSockets = sockets.filter(
        (socket) => socket.data.discordId === discordId,
      );

      if (userSockets.length === 0) {
        return;
      }

      for (const socket of userSockets) {
        const updatedGuilds = socket.data.devPermissionOverride
          ? await this.guildsService.getUserGuilds({
              discordId,
              userId,
              devPermissionOverride: socket.data.devPermissionOverride,
            })
          : defaultUpdatedGuilds;
        const currentRooms = Array.from(socket.rooms).filter(
          (room) => room !== socket.id,
        );

        const { rooms: newFeatureRooms } = calculateUserRooms(
          updatedGuilds,
          discordId,
          socket.data.platform,
        );
        const removedGuildIds = this.getRemovedGuildIds(
          socket.data.guilds,
          updatedGuilds,
        );

        const roomsToLeave = currentRooms.filter(
          (room) => !newFeatureRooms.includes(room),
        );
        const roomsToJoin = newFeatureRooms.filter(
          (room) => !currentRooms.includes(room),
        );

        for (const room of roomsToLeave) {
          socket.leave(room);
        }

        for (const room of roomsToJoin) {
          socket.join(room);
        }

        await this.cleanupRemovedGuildSessions(socket, removedGuildIds);

        socket.data.guilds = updatedGuilds;

        socket.emit(GatewayEvent.PERMISSIONS_UPDATED, {
          guilds: updatedGuilds,
          featureRooms: newFeatureRooms,
        });

        if (updatedGuilds.length === 0) {
          socket.disconnect(true);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to rebalance socket rooms for user ${discordId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async cleanupRemovedGuildSessions(
    socket: FetchedSocket,
    removedGuildIds: string[],
  ): Promise<void> {
    if (removedGuildIds.length === 0) {
      return;
    }

    const client = socket as unknown as Socket;

    await this.activityService.publishActivityEventForGuildIds(
      ActivityType.DISCONNECT_EVENT,
      client,
      removedGuildIds,
    );
    this.presenceService.emitDisconnectPresenceForGuildIds(
      this.gateway.server,
      client,
      removedGuildIds,
    );
    await this.presenceService.broadcastPlayerDisconnectForGuildIds(
      this.gateway.server,
      client,
      removedGuildIds,
    );
  }

  private getRemovedGuildIds(
    currentGuilds: UserGuildData[] | undefined,
    updatedGuilds: UserGuildData[],
  ): string[] {
    if (!currentGuilds || currentGuilds.length === 0) {
      return [];
    }

    const updatedGuildIds = new Set(updatedGuilds.map(({ guild }) => guild.id));

    return currentGuilds
      .map(({ guild }) => guild.id)
      .filter((guildId) => !updatedGuildIds.has(guildId));
  }

  handleEventMapStatusUpdate(data: EventMapStatusUpdatePayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_MAP_STATUS_UPDATE, data);
  }

  async checkPresenceForMap(guildId: string, mapName: string): Promise<void> {
    await this.gateway.checkPresenceForMap(guildId, mapName);
  }

  handleEventHeroKilled(data: EventHeroKilledPayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_HERO_KILLED, data);
  }

  handleEventRankingUpdate(data: EventRankingUpdatePayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_RANKING_UPDATE, data);
  }

  handleEventRespawnWindowOpened(data: EventRespawnWindowPayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED, data);
  }

  handleEventRespawnWindowClosed(data: EventRespawnWindowPayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.gateway.server
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED, data);
  }

  async handleVolunteerNotification(data: VolunteerNotificationDto) {
    const sockets = await this.fetchSocketsSafely(
      () => this.gateway.server.fetchSockets(),
      `volunteer notification ${data.notificationId}`,
    );
    const targetSockets = sockets.filter(
      (socket) => socket.data.discordId === data.targetDiscordId,
    );

    targetSockets.forEach((socket) => {
      socket.emit(GatewayEvent.NOTIFICATIONS_VOLUNTEER, {
        notificationId: data.notificationId,
        volunteer: {
          discordId: data.volunteerDiscordId,
          world: data.world,
          ...data.character,
        },
      });
    });
  }

  handlePartyGatheringSend(data: SendPartyGatheringDto) {
    const rooms = [
      buildRoomName(data.guildId, "notifications", "base"),
      buildRoomName(data.guildId, "notifications", "titans"),
      buildRoomName(data.guildId, "notifications", "heroes"),
    ];
    this.gateway.server.to(rooms).emit(GatewayEvent.PARTY_GATHERING_SEND, data);
  }

  handlePartyGatheringCancel(data: {
    guildId: string;
    notificationId: string;
  }) {
    const rooms = [
      buildRoomName(data.guildId, "notifications", "base"),
      buildRoomName(data.guildId, "notifications", "titans"),
      buildRoomName(data.guildId, "notifications", "heroes"),
    ];
    this.gateway.server.to(rooms).emit(GatewayEvent.PARTY_GATHERING_CANCEL, {
      notificationId: data.notificationId,
    });
  }

  handleChatMessageUpdate(data: ChatMessageUpdateDto) {
    const { routing, ...payload } = data;

    this.emitToFeatureRoom({
      guildId: payload.guildId,
      feature: "chat",
      tier: routing.tier,
      event: GatewayEvent.CHAT_MESSAGE_UPDATE,
      data: {
        messageId: payload.messageId,
        guildId: payload.guildId,
        message: payload.message,
      },
      npcLevel: routing.npcLevel,
    });
  }

  handleChatMessageDelete(data: ChatMessageDeleteDto) {
    const { routing, ...payload } = data;

    this.emitToFeatureRoom({
      guildId: payload.guildId,
      feature: "chat",
      tier: routing.tier,
      event: GatewayEvent.CHAT_MESSAGE_DELETE,
      data: {
        messageId: payload.messageId,
        guildId: payload.guildId,
      },
      npcLevel: routing.npcLevel,
    });
  }

  handleChatMessagesClear(data: ChatMessagesClearDto) {
    const rooms = [
      buildRoomName(data.guildId, "chat", "base"),
      buildRoomName(data.guildId, "chat", "titans"),
      buildRoomName(data.guildId, "chat", "heroes"),
    ];

    this.gateway.server.to(rooms).emit(GatewayEvent.CHAT_MESSAGES_CLEAR, {
      guildId: data.guildId,
    });
  }

  private getNpcFeatureRouting(npc?: {
    lvl?: number;
    prof?: string;
    type?: number | string;
    wt?: number | string;
  }): FeatureRouting {
    if (!npc) {
      return { tier: "base" };
    }

    return {
      tier: getNpcTier(npc),
      npcLevel: npc.lvl,
    };
  }

  private getChatMessageRouting(
    data: Pick<SendMessageDto, "type" | "npc">,
  ): FeatureRouting {
    const hasNpcScopedRouting =
      data.type === MessageType.NPC ||
      (data.type === MessageType.PARTY_GATHERING && data.npc);

    if (!hasNpcScopedRouting || !data.npc) {
      return { tier: "base" };
    }

    return this.getNpcFeatureRouting(data.npc);
  }

  private async fetchSocketsSafely(
    fetchSockets: () => Promise<FetchedSocket[]>,
    context: string,
  ): Promise<FetchedSocket[]> {
    try {
      return await fetchSockets();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to fetch sockets for ${context}: ${message}`);
      return [];
    }
  }

  private toChatMessageEnvelope(
    message: SendMessageDto,
    viewerDiscordId: string,
    isOwnerOrAdmin: boolean,
  ): ChatMessageEnvelopeDto {
    const canManageMessage =
      viewerDiscordId === message.senderId || isOwnerOrAdmin;

    return {
      ...message,
      canEdit: canManageMessage,
      canDelete: canManageMessage,
    };
  }
}
