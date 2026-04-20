import type { CreateTimerDto } from "./dto/create-timer.dto.js";
import type { DeleteTimerDto } from "./dto/delete-timer.dto.js";
import type { RefreshJobUpdateDto } from "./dto/refresh-job-update.dto.js";
import type {
  ReservationCreateEventDto,
  ReservationDeleteEventDto,
} from "./dto/reservation-event.dto.js";
import { MessageType, type SendMessageDto } from "./dto/send-message.dto.js";
import type { SendNotificationDto } from "./dto/send-notification.dto.js";
import type { SendPartyGatheringDto } from "./dto/send-party-gathering.dto.js";
import type { VolunteerNotificationDto } from "./dto/volunteer-notification.dto.js";
import { GatewayEvent } from "./enums/gateway-event.enum.js";
import type {
  EventHeroKilledPayload,
  EventRespawnWindowPayload,
  EventMapStatusUpdatePayload,
  EventRankingUpdatePayload,
} from "./types/margo-event.types.js";
import {
  buildRoomName,
  calculateUserRooms,
  getNpcTier,
  hasFeatureRoomAccess,
  type FeatureName,
  type TierName,
} from "./utils/room-utils.js";
import { SocketServerRef } from "./socket-server-ref.js";
import { PresenceService } from "./services/presence.service.js";
import { GuildsService } from "../guilds/guilds.service.js";
import type { UserGuildData } from "../guilds/types/guild.types.js";
import { isOwnerOrAdminFromRoles } from "../guilds/utils/is-administrative-user.js";
import { RedisStore } from "../lib/redis/redis-store.js";

type FeatureRouting = {
  tier: TierName;
  npcLevel?: number;
};

type RoutedDeleteTimerDto = DeleteTimerDto;

type RoutedChatMessageUpdate = {
  guildId: string;
  messageId: string;
  message: string;
  routing: FeatureRouting;
};

type RoutedChatMessageDelete = {
  guildId: string;
  messageId: string;
  routing: FeatureRouting;
};

export class GatewayService {
  constructor(
    private readonly socketServerRef: SocketServerRef,
    private readonly redisStore: RedisStore,
    private readonly guildsService: GuildsService,
    private readonly presenceService: PresenceService,
    private readonly logger: {
      error(message: string, meta?: Record<string, unknown>): void;
    },
  ) {}

  private async emitToFeatureRoom({
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
    const gatewayNamespace = this.socketServerRef.get();

    if (npcLevel !== undefined) {
      const sockets = await gatewayNamespace.in(room).fetchSockets();

      for (const socket of sockets) {
        const guildData = socket.data.guilds?.find(
          (guild: UserGuildData) => guild.guild.id === guildId,
        );
        if (!guildData) {
          continue;
        }

        const isOwner = guildData.guild.ownerId === socket.data.discordId;
        if (isOwner || isOwnerOrAdminFromRoles(guildData.roles)) {
          socket.emit(event, data);
          continue;
        }

        if (hasFeatureRoomAccess(guildData.roles, feature, tier, npcLevel)) {
          socket.emit(event, data);
        }
      }

      return;
    }

    gatewayNamespace.to(room).emit(event, data);
  }

  async handleGuildsTimerUpdate(data: CreateTimerDto) {
    const routing = this.getNpcFeatureRouting(data.npc);
    await this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "timers",
      tier: routing.tier,
      event: GatewayEvent.TIMERS_CREATE,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  async handleGuildsTimerDelete(data: RoutedDeleteTimerDto) {
    const { routing, ...payload } = data;

    await this.emitToFeatureRoom({
      guildId: payload.guildId,
      feature: "timers",
      tier: routing.tier,
      event: GatewayEvent.TIMERS_DELETE,
      data: payload,
      npcLevel: routing.npcLevel,
    });
  }

  handleGuildsReservationCreate(data: ReservationCreateEventDto) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.RESERVATIONS_CREATE, data);
  }

  handleGuildsReservationDelete(data: ReservationDeleteEventDto) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.RESERVATIONS_DELETE, data);
  }

  async handleGuildMessageSend(data: SendMessageDto) {
    const routing = this.getChatMessageRouting(data);
    await this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "chat",
      tier: routing.tier,
      event: GatewayEvent.CHAT_MESSAGE,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  async handleGuildNotificationSend(data: SendNotificationDto) {
    const routing = this.getNpcFeatureRouting(data.npc);
    await this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: "notifications",
      tier: routing.tier,
      event: GatewayEvent.NOTIFICATIONS_SEND,
      data,
      npcLevel: routing.npcLevel,
    });
  }

  async invalidatePlayerCache(discordId: string) {
    await this.redisStore.del(discordId);
  }

  handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    const adminRoom = buildRoomName(data.guildId, "admin");
    this.socketServerRef
      .get()
      .to(adminRoom)
      .emit(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, data);
  }

  async invalidateUserGuildsCache(discordId: string, userId: string) {
    await this.guildsService.invalidateUserGuildsCache(discordId, userId);
  }

  async rebalanceUserSocketRooms(discordId: string, userId: string) {
    try {
      const updatedGuilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });

      const sockets = await this.socketServerRef.get().fetchSockets();
      const userSockets = sockets.filter(
        (socket) => socket.data.discordId === discordId,
      );

      if (userSockets.length === 0) {
        return;
      }

      for (const socket of userSockets) {
        const currentRooms = Array.from(socket.rooms).filter(
          (room) => room !== socket.id,
        );

        const { rooms: newFeatureRooms } = calculateUserRooms(
          updatedGuilds,
          discordId,
          socket.data.platform,
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

        socket.data.guilds = updatedGuilds;

        socket.emit(GatewayEvent.PERMISSIONS_UPDATED, {
          guilds: updatedGuilds,
          featureRooms: newFeatureRooms,
        });
      }
    } catch (error) {
      this.logger.error("Failed to rebalance socket rooms", {
        discordId,
        userId,
        error,
      });
    }
  }

  handleEventMapStatusUpdate(data: EventMapStatusUpdatePayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_MAP_STATUS_UPDATE, data);
  }

  async checkPresenceForMap(guildId: string, mapName: string): Promise<void> {
    await this.presenceService.checkPresenceForMap(
      this.socketServerRef.get(),
      guildId,
      mapName,
    );
  }

  handleEventHeroKilled(data: EventHeroKilledPayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_HERO_KILLED, data);
  }

  handleEventRankingUpdate(data: EventRankingUpdatePayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_RANKING_UPDATE, data);
  }

  handleEventRespawnWindowOpened(data: EventRespawnWindowPayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED, data);
  }

  handleEventRespawnWindowClosed(data: EventRespawnWindowPayload) {
    const eventsRoom = buildRoomName(data.guildId, "events");
    this.socketServerRef
      .get()
      .to(eventsRoom)
      .emit(GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED, data);
  }

  async handleVolunteerNotification(data: VolunteerNotificationDto) {
    const sockets = await this.socketServerRef.get().fetchSockets();
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
    this.socketServerRef
      .get()
      .to(rooms)
      .emit(GatewayEvent.PARTY_GATHERING_SEND, data);
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
    this.socketServerRef
      .get()
      .to(rooms)
      .emit(GatewayEvent.PARTY_GATHERING_CANCEL, {
        notificationId: data.notificationId,
      });
  }

  async handleChatMessageUpdate(data: RoutedChatMessageUpdate) {
    const { routing, ...payload } = data;

    await this.emitToFeatureRoom({
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

  async handleChatMessageDelete(data: RoutedChatMessageDelete) {
    const { routing, ...payload } = data;

    await this.emitToFeatureRoom({
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
}
