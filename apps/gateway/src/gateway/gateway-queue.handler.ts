import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateTimerDto } from 'src/gateway/dto/create-timer.dto';
import { SendMessageDto } from 'src/gateway/dto/send-message.dto';
import { Queue } from 'src/gateway/enums/queue.enum';
import { RoutingKey } from 'src/gateway/enums/routing-key.enum';
import { GatewayService } from 'src/gateway/gateway.service';

@Injectable()
export class GatewayQueueHandler {
  constructor(private readonly gatewayService: GatewayService) {}

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
    queue: Queue.GUILDS_TIMERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildsTimerUpdate(data: CreateTimerDto) {
    this.gatewayService.handleGuildsTimerUpdate(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_SEND_MESSAGE,
    queue: Queue.GUILDS_SEND_MESSAGE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildMessageSend(data: SendMessageDto) {
    this.gatewayService.handleGuildMessageSend(data);
  }
}
