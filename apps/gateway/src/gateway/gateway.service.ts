import { Injectable } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { DeleteTimerDto } from 'src/gateway/dto/delete-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { SendNotificationDto } from 'src/gateway/dto/send-notification.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { Gateway } from 'src/gateway/gateway';
import { RedisService } from 'src/lib/redis/redis.service';

@Injectable()
export class GatewayService {
  constructor(
    private readonly gateway: Gateway,
    private redis: RedisService,
  ) {}

  async handleGuildsTimerUpdate(data: CreateTimerDto) {
    this.gateway.server.to(data.guildId).emit(GatewayEvent.TIMERS_CREATE, data);
  }

  async handleGuildsTimerDelete(data: DeleteTimerDto) {
    this.gateway.server.to(data.guildId).emit(GatewayEvent.TIMERS_DELETE, data);
  }

  async handleGuildMessageSend(data: SendMessageDto) {
    this.gateway.server.to(data.guildId).emit(GatewayEvent.CHAT_MESSAGE, data);
  }

  async handleGuildNotificationSend(data: SendNotificationDto) {
    this.gateway.server
      .to(data.guildId)
      .emit(GatewayEvent.NOTIFICATIONS_SEND, data);
  }

  async invalidatePlayerCache(discordId: string) {
    this.redis.del(discordId);
  }
}
