import { Injectable, Logger } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { NpcType } from 'src/gateway/enums/npc-type.enum';
import { Gateway } from 'src/gateway/gateway';
import { Permission } from 'src/guilds/enum/permission.type';
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
    type,
    event,
    data,
  }: {
    guildId: string;
    npc: { lvl: number; type: NpcType };
    type: NpcType;
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
          const ranges = desiredGuild?.ranges || [];

          const administrativeUser = isAdministrativeUser(
            desiredGuild.permissions,
          );
          const canReadTitans =
            administrativeUser ||
            desiredGuild.permissions.includes(
              Permission.LOOTLOG_READ_TIMERS_TITANS,
            );
          if (!canReadTitans && type === NpcType.TITAN) {
            this.logger.debug(
              `User ${socket.data.discordId} tried to send a titan event in guild ${guildId}, but does not have permission.`,
            );
            return;
          }

          const isInRange = ranges.some(
            (range: { from: number; to: number }) =>
              npcLevel >= range.from && npcLevel <= range.to,
          );

          if (!isInRange && !administrativeUser) {
            this.logger.debug(
              `NPC level ${npcLevel} is not in range for guild ${guildId} for user ${socket.data.discordId}`,
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
      npc: { lvl: (data as any).lvl ?? 0, type: (data as any).type },
      type: (data as any).type,
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
      type: data.npc.type,
      event: GatewayEvent.NOTIFICATIONS_SEND,
      data,
    });
  }

  async invalidatePlayerCache(discordId: string) {
    await this.redis.del(discordId);
  }
}
