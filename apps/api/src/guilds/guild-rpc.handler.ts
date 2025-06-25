import {
  MessageHandlerErrorBehavior,
  RabbitRPC,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { Queue } from 'src/enum/queue.enum';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { GuildsService } from 'src/guilds/guilds.service';

@Injectable()
export class GuildsRpcHandler {
  constructor(private readonly guildsService: GuildsService) {}

  @RabbitRPC({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_RPC_GET_USER_GUILDS,
    queue: Queue.GUILDS_RPC_GET_USER_GUILDS,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async getUserGuilds(data: { discordId: string }) {
    const guilds = await this.guildsService.getUserGuilds(data.discordId);
    return guilds;
  }
}
