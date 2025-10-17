import { Injectable, Logger } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import { RefreshJobUpdateDto } from 'src/gateway/dto/refresh-job-update.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { Gateway } from 'src/gateway/gateway';
import { Npc } from 'src/gateway/types/npc.type';
import { canViewNpcTimer } from 'src/gateway/utils/can-view-npc-timer';
import { isAdministrativeUserFromRoles } from 'src/guilds/utils/is-administrative-user';
import { RedisService } from 'src/lib/redis/redis.service';
import { GuildsService } from 'src/guilds/guilds.service';
import { getGuildIds } from 'src/gateway/utils/get-guild-ids';

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
    npc,
    event,
    data,
  }: {
    guildId: string;
    npc: Npc;
    event: GatewayEvent;
    data: any;
  }) {
    this.gateway.server
      .in(guildId)
      .fetchSockets()
      .then((sockets) => {
        const npcLevel = npc?.lvl ?? 0;
        sockets.forEach((socket) => {
          const desiredGuild = socket.data.guilds?.find(
            (g: any) => g.guild.id === guildId,
          );
          if (!desiredGuild) return;
          if (!npc) {
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

          const canViewNpc = canViewNpcTimer(npc, roles);

          if (!canViewNpc) {
            this.logger.debug(
              `User ${socket.data.discordId} cannot view NPC ${npc.type} lvl ${npcLevel} in guild ${guildId}`,
            );
            return;
          }

          socket.emit(event, data);
        });
      });
  }

  async handleGuildsTimerUpdate(data: CreateTimerDto) {
    this.emitToEligibleSockets({
      guildId: data.guildId,
      npc: data.npc,
      event: GatewayEvent.TIMERS_CREATE,
      data,
    });
  }

  async handleGuildsTimerDelete(data: DeleteTimerDto) {
    this.gateway.server.to(data.guildId).emit(GatewayEvent.TIMERS_DELETE, data);
  }

  async handleGuildMessageSend(data: SendMessageDto) {
    this.gateway.server.to(data.guildId).emit(GatewayEvent.CHAT_MESSAGE, data);
  }

  async handleGuildNotificationSend(data: SendNotificationDto) {
    this.emitToEligibleSockets({
      guildId: data.guildId,
      npc: data.npc,
      event: GatewayEvent.NOTIFICATIONS_SEND,
      data,
    });
  }

  async invalidatePlayerCache(discordId: string) {
    await this.redis.del(discordId);
  }

  async handleMembersRefreshJobUpdate(data: RefreshJobUpdateDto) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE, data);
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
