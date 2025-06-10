import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import {
  DEFAULT_EXCHANGE_NAME,
  DEFAULT_RPC_TIMEOUT,
} from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/guilds/enum/routing-key.enum';

@Injectable()
export class GuildsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async getUserGuilds(discordId: string) {
    const response = await this.amqpConnection.request<{ id: string }[]>({
      exchange: DEFAULT_EXCHANGE_NAME,
      routingKey: RoutingKey.GUILDS_RPC_GET_USER_GUILDS,
      payload: {
        discordId,
      },
      timeout: DEFAULT_RPC_TIMEOUT,
    });

    return response.map((guild) => guild.id);
  }
}
