import { Injectable } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { GatewayEvent } from 'src/gateway/enums/gateway-event.enum';
import { Gateway } from 'src/gateway/gateway';

@Injectable()
export class GatewayService {
  constructor(private readonly gateway: Gateway) {}

  async handleGuildsTimerUpdate(data: CreateTimerDto) {
    console.log('create timer ', data);
    this.gateway.server.to(data.guildId).emit(GatewayEvent.TIMERS_CREATE, data);
  }

  async handleGuildMessageSend(data: SendMessageDto) {
    console.log('send message ', data);
    this.gateway.server.to(data.guildId).emit(GatewayEvent.CHAT_MESSAGE, data);
  }
}
