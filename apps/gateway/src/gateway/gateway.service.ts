import { Injectable, Logger } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { NpcType } from 'src/gateway/enums/npc-type.enum';
import { Gateway } from 'src/gateway/gateway';
import { Npc } from 'src/gateway/types/npc.type';
import { canViewNpcTimer } from 'src/gateway/utils/can-view-npc-timer';
import { isAdministrativeUser } from 'src/guilds/utils/is-administrative-user';
import { RedisService } from 'src/lib/redis/redis.service';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly gateway: Gateway,
    private redis: RedisService,
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
          const desiredGuild = socket.data.guilds.find(
            (g: any) => g.guild.id === guildId,
          );
          if (!desiredGuild) return;
          if (!npc) {
            socket.emit(event, data);
            return;
          }
          const administrativeUser = isAdministrativeUser(
            desiredGuild.permissions,
          );

          if (administrativeUser) {
            this.logger.debug(
              `Administrative user ${socket.data.discordId} sending event ${event} in guild ${guildId}`,
            );
            socket.emit(event, data);
            return;
          }

          const roles = desiredGuild.roles || [];
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
}
