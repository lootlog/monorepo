import { Injectable, Logger } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import type { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import type { RefreshJobUpdateDto } from 'src/gateway/dto/refresh-job-update.dto';
import type {
  ReservationCreateEventDto,
  ReservationDeleteEventDto,
} from 'src/gateway/dto/reservation-event.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { SubscriptionMode } from 'src/gateway/enums/subscription-mode.enum';
import { Gateway } from 'src/gateway/gateway';
import { isAdministrativeUserFromRoles } from 'src/guilds/utils/is-administrative-user';
import { RedisService } from 'src/lib/redis/redis.service';
import { GuildsService } from 'src/guilds/guilds.service';
import type { UserGuildData } from 'src/guilds/types/guild.types';
import type {
  EventHeroKilledPayload,
  EventRankingUpdatePayload,
  EventRespawnWindowPayload,
  EventMapStatusUpdatePayload,
} from 'src/gateway/types/margo-event.types';
import {
  buildRoomName,
  getNpcTier,
  checkLevelRange,
  calculateUserRooms,
  type FeatureName,
  type TierName,
} from 'src/gateway/utils/room-utils';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly gateway: Gateway,
    private readonly redis: RedisService,
    private readonly guildsService: GuildsService,
  ) {}

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
      // Level filtering required - fetch sockets and filter
      this.gateway.server
        .in(room)
        .fetchSockets()
        .then((sockets) => {
          sockets.forEach((socket) => {
            const guildData = socket.data.guilds?.find(
              (g: UserGuildData) => g.guild.id === guildId,
            );
            if (!guildData) return;

            // Owner/Admin bypass level checks
            const isOwner = guildData.guild.ownerId === socket.data.discordId;
            if (isOwner || isAdministrativeUserFromRoles(guildData.roles)) {
              socket.emit(event, data);
              return;
            }

            // Check level range for regular members
            if (checkLevelRange(guildData.roles, npcLevel)) {
              socket.emit(event, data);
            }
          });
        });
    } else {
      // No level filtering - direct room broadcast
      this.gateway.server.to(room).emit(event, data);
    }
  }

  handleGuildsTimerUpdate(data: CreateTimerDto) {
    const tier = getNpcTier(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: 'timers',
      tier,
      event: GatewayEvent.TIMERS_CREATE,
      data,
      npcLevel: data.npc?.lvl,
    });
  }

  handleGuildsTimerDelete(data: DeleteTimerDto) {
    const rooms = [
      buildRoomName(data.guildId, 'timers', 'base'),
      buildRoomName(data.guildId, 'timers', 'titans'),
      buildRoomName(data.guildId, 'timers', 'heroes'),
    ];
    this.gateway.server.to(rooms).emit(GatewayEvent.TIMERS_DELETE, data);
  }

  handleGuildsReservationCreate(data: ReservationCreateEventDto) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.RESERVATIONS_CREATE, data);
  }

  handleGuildsReservationDelete(data: ReservationDeleteEventDto) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.RESERVATIONS_DELETE, data);
  }

  handleGuildMessageSend(data: SendMessageDto) {
    // For NPC messages, use npc data; for regular messages, use 'base' tier
    const tier = getNpcTier(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: 'chat',
      tier,
      event: GatewayEvent.CHAT_MESSAGE,
      data,
      npcLevel: data.npc?.lvl,
    });
  }

  handleGuildNotificationSend(data: SendNotificationDto) {
    const tier = getNpcTier(data.npc);
    this.emitToFeatureRoom({
      guildId: data.guildId,
      feature: 'notifications',
      tier,
      event: GatewayEvent.NOTIFICATIONS_SEND,
      data,
      npcLevel: data.npc?.lvl,
    });
  }

  async invalidatePlayerCache(discordId: string) {
    await this.redis.del(discordId);
  }

  handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    // Emit directly to admin room - only owner/admin are in this room
    const adminRoom = buildRoomName(data.guildId, 'admin');
    this.gateway.server.to(adminRoom).emit(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, data);
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

      const sockets = await this.gateway.server.fetchSockets();
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
          socket.data.subscriptionMode ?? SubscriptionMode.ALL,
          socket.data.activeGuildId,
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
      this.logger.error(
        `Failed to rebalance socket rooms for user ${discordId}: ${error.message}`,
        error.stack,
      );
    }
  }

  handleEventMapStatusUpdate(data: EventMapStatusUpdatePayload) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.EVENT_MAP_STATUS_UPDATE, data);
  }

  async checkPresenceForMap(guildId: string, mapName: string): Promise<void> {
    await this.gateway.checkPresenceForMap(guildId, mapName);
  }

  handleEventHeroKilled(data: EventHeroKilledPayload) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.EVENT_HERO_KILLED, data);
  }

  handleEventRankingUpdate(data: EventRankingUpdatePayload) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.EVENT_RANKING_UPDATE, data);
  }

  handleEventRespawnWindowOpened(data: EventRespawnWindowPayload) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED, data);
  }

  handleEventRespawnWindowClosed(data: EventRespawnWindowPayload) {
    const eventsRoom = buildRoomName(data.guildId, 'events');
    this.gateway.server.to(eventsRoom).emit(GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED, data);
  }
}
