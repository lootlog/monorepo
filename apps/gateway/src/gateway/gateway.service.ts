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
import { Gateway } from 'src/gateway/gateway';
import { isAdministrativeUserFromRoles } from 'src/guilds/utils/is-administrative-user';
import { RedisService } from 'src/lib/redis/redis.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { getGuildIds } from 'src/gateway/utils/get-guild-ids';
import type { UserGuildData } from 'src/guilds/types/guild.types';
import {
  buildRoomName,
  getNpcTier,
  checkLevelRange,
  isFeatureRoom,
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
            } else {
              this.logger.debug(
                `User ${socket.data.discordId} filtered out by level range for NPC lvl ${npcLevel}`,
              );
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
    this.gateway.server.to(data.guildId).emit(GatewayEvent.TIMERS_DELETE, data);
  }

  handleGuildsReservationCreate(data: ReservationCreateEventDto) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.RESERVATIONS_CREATE, data);
  }

  handleGuildsReservationDelete(data: ReservationDeleteEventDto) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.RESERVATIONS_DELETE, data);
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
    this.logger.debug(`Invalidated guilds cache for user ${discordId}`);
  }

  async rebalanceUserSocketRooms(discordId: string, userId: string) {
    try {
      const updatedGuilds = await this.guildsService.getUserGuilds({
        discordId,
        userId,
      });

      const updatedGuildIds = getGuildIds(updatedGuilds);
      const sockets = await this.gateway.server.fetchSockets();
      const userSockets = sockets.filter(
        (socket) => socket.data.discordId === discordId,
      );

      if (userSockets.length === 0) {
        this.logger.debug(`No active sockets found for user ${discordId}`);
        return;
      }

      for (const socket of userSockets) {
        const currentRooms = Array.from(socket.rooms).filter(
          (room) => room !== socket.id,
        );

        // Separate legacy guild rooms from feature rooms
        const currentGuildRooms = currentRooms.filter((r) => !isFeatureRoom(r));
        const currentFeatureRooms = currentRooms.filter((r) => isFeatureRoom(r));

        // Calculate new feature rooms based on subscription mode
        const { rooms: newFeatureRooms } = calculateUserRooms(
          updatedGuilds,
          discordId,
          socket.data.subscriptionMode ?? 'all',
          socket.data.activeGuildId,
          socket.data.platform,
        );

        // Handle legacy guild rooms
        const guildRoomsToLeave = currentGuildRooms.filter(
          (room) => !updatedGuildIds.includes(room),
        );
        const guildRoomsToJoin = updatedGuildIds.filter(
          (guildId) => !currentGuildRooms.includes(guildId),
        );

        // Handle feature rooms
        const featureRoomsToLeave = currentFeatureRooms.filter(
          (room) => !newFeatureRooms.includes(room),
        );
        const featureRoomsToJoin = newFeatureRooms.filter(
          (room) => !currentFeatureRooms.includes(room),
        );

        // Leave old rooms
        for (const room of [...guildRoomsToLeave, ...featureRoomsToLeave]) {
          socket.leave(room);
          this.logger.debug(
            `User ${discordId} left room ${room} (lost permissions)`,
          );
        }

        // Join new rooms
        for (const room of [...guildRoomsToJoin, ...featureRoomsToJoin]) {
          socket.join(room);
        }

        const totalJoined = guildRoomsToJoin.length + featureRoomsToJoin.length;
        if (totalJoined > 0) {
          this.logger.debug(
            `User ${discordId} joined ${totalJoined} new rooms (gained permissions)`,
          );
        }

        // Update socket data
        socket.data.guilds = updatedGuilds;

        socket.emit(GatewayEvent.PERMISSIONS_UPDATED, {
          guilds: updatedGuilds,
          featureRooms: newFeatureRooms,
        });
      }

      this.logger.debug(`Rebalanced socket rooms for user ${discordId}`);
    } catch (error) {
      this.logger.error(
        `Failed to rebalance socket rooms for user ${discordId}: ${error.message}`,
        error.stack,
      );
    }
  }

  handleEventPresenceUpdate(data: {
    guildId: string;
    eventId: string;
    mapId: string;
    presenceLog: any;
  }) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.EVENT_PRESENCE_UPDATE, data);
  }

  handleEventMapStatusUpdate(data: {
    guildId: string;
    eventId: string;
    mapId: string;
  }) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.EVENT_MAP_STATUS_UPDATE, data);
  }

  handleEventHeroKilled(data: {
    guildId: string;
    eventId: string;
    heroNpcId: string;
    kill: any;
  }) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.EVENT_HERO_KILLED, data);
  }

  handleEventRankingUpdate(data: {
    guildId: string;
    eventId: string;
    rankings: any;
  }) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.EVENT_RANKING_UPDATE, data);
  }
}
