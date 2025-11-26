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
import { canViewNpcTimer } from '@lootlog/api-helpers/permissions';
import {
  isAdministrativeUserFromRoles,
  isOwnerOrAdminFromRoles,
} from 'src/guilds/utils/is-administrative-user';
import { RedisService } from 'src/lib/redis/redis.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { getGuildIds } from 'src/gateway/utils/get-guild-ids';
import type { UserGuildData } from 'src/guilds/types/guild.types';
import { canViewChatMessage } from './utils/can-view-chat-message';
import { canViewNpcNotification } from './utils/can-view-npc-notifications';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly gateway: Gateway,
    private readonly redis: RedisService,
    private readonly guildsService: GuildsService,
  ) {}

  private emitToEligibleSockets({
    guildId,
    event,
    data,
  }: {
    guildId: string;
    event: GatewayEvent;
    data: unknown;
  }) {
    this.gateway.server
      .in(guildId)
      .fetchSockets()
      .then((sockets) => {
        sockets.forEach((socket) => {
          const desiredGuild = socket.data.guilds?.find(
            (g: UserGuildData) => g.guild.id === guildId,
          );
          if (!desiredGuild) return;

          const isOwner = desiredGuild.guild.ownerId === socket.data.discordId;

          if (isOwner) {
            this.logger.debug(
              `Guild owner ${socket.data.discordId} sending event ${event} in guild ${guildId}`,
            );
            socket.emit(event, data);
            return;
          }

          const roles = desiredGuild.roles || [];
          const administrativeUser = isAdministrativeUserFromRoles(roles);

          if (administrativeUser) {
            this.logger.debug(
              `Administrative user ${socket.data.discordId} sending event ${event} in guild ${guildId}`,
            );
            socket.emit(event, data);
            return;
          }

          if (data instanceof SendMessageDto) {
            if (!data.characterData) {
              this.logger.log(
                `Missing character data for chat message in guild ${guildId} from user ${socket.data.discordId}`,
              );
              return;
            }
            const canViewChat = canViewChatMessage(data, roles);
            if (!canViewChat) {
              this.logger.log(
                `User ${socket.data.discordId} cannot view chat message ${JSON.stringify(data)} in guild ${guildId}`,
              );
              return;
            }

            socket.emit(event, data);
          } else if (data instanceof CreateTimerDto) {
            const canViewNpc = canViewNpcTimer(
              { lvl: data.npc?.lvl ?? 0, type: data.npc.type },
              roles,
            );

            if (!canViewNpc) {
              this.logger.debug(
                `User ${socket.data.discordId} cannot view NPC ${data.npc?.type} lvl ${data.npc?.lvl ?? 0} in guild ${guildId}`,
              );
              return;
            }

            socket.emit(event, data);
          } else if (data instanceof SendNotificationDto) {
            const canViewNpc = canViewNpcNotification(data.npc, roles);

            if (!canViewNpc) {
              this.logger.debug(
                `User ${socket.data.discordId} cannot view NPC ${data.npc?.type} lvl ${data.npc?.lvl ?? 0} in guild ${guildId}`,
              );
              return;
            }

            socket.emit(event, data);
          }
        });
      });
  }

  handleGuildsTimerUpdate(data: CreateTimerDto) {
    this.emitToEligibleSockets({
      guildId: data.guildId,
      event: GatewayEvent.TIMERS_CREATE,
      data: Object.assign(new CreateTimerDto(), data),
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
    this.emitToEligibleSockets({
      guildId: data.guildId,
      event: GatewayEvent.CHAT_MESSAGE,
      data: Object.assign(new SendMessageDto(), data),
    });
  }

  handleGuildNotificationSend(data: SendNotificationDto) {
    this.emitToEligibleSockets({
      guildId: data.guildId,
      event: GatewayEvent.NOTIFICATIONS_SEND,
      data: Object.assign(new SendNotificationDto(), data),
    });
  }

  async invalidatePlayerCache(discordId: string) {
    await this.redis.del(discordId);
  }

  async handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    const sockets = await this.gateway.server.in(data.guildId).fetchSockets();

    sockets.forEach((socket) => {
      const desiredGuild = socket.data.guilds?.find(
        (g: any) => g.guild.id === data.guildId,
      );

      if (!desiredGuild) return;

      const roles = desiredGuild.roles || [];
      const hasPermission = isOwnerOrAdminFromRoles(roles);

      if (!hasPermission) {
        this.logger.debug(
          `User ${socket.data.discordId} does not have OWNER/ADMIN permissions for refresh job in guild ${data.guildId}`,
        );
        return;
      }

      socket.emit(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, data);
    });
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

        const roomsToLeave = currentRooms.filter(
          (room) => !updatedGuildIds.includes(room),
        );
        const roomsToJoin = updatedGuildIds.filter(
          (guildId) => !currentRooms.includes(guildId),
        );

        for (const room of roomsToLeave) {
          await socket.leave(room);
          this.logger.debug(
            `User ${discordId} left room ${room} (lost permissions)`,
          );
        }

        for (const room of roomsToJoin) {
          await socket.join(room);
        }

        if (roomsToJoin.length > 0) {
          this.logger.debug(
            `User ${discordId} joined ${roomsToJoin.length} new rooms (gained permissions)`,
          );
        }

        socket.emit(GatewayEvent.PERMISSIONS_UPDATED, {
          guilds: updatedGuilds,
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
}
