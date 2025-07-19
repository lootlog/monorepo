import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_EXCHANGE_NAME,
  DEFAULT_RPC_TIMEOUT,
} from 'src/config/rabbitmq.config';
import { Permission } from 'src/guilds/enum/permission.type';
import { RoutingKey } from 'src/guilds/enum/routing-key.enum';

type GetGuildsResponse = {
  guild: { id: string };
  permissions: Permission[];
  roles: { id: string; lvlRangeFrom: number; lvlRangeTo: number }[];
}[];

@Injectable()
export class GuildsService {
  private readonly logger = new Logger(GuildsService.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async getUserGuilds(options: { discordId: string; userId: string }) {
    const { discordId, userId } = options;

    try {
      const response = await this.amqpConnection.request<GetGuildsResponse>({
        exchange: DEFAULT_EXCHANGE_NAME,
        routingKey: RoutingKey.GUILDS_RPC_GET_USER_GUILDS,
        payload: { discordId, userId },
        timeout: DEFAULT_RPC_TIMEOUT,
      });
      return response.map((data) => ({
        guild: data.guild,
        roles: data.roles,
        permissions: data.permissions,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch guilds for user ${discordId}: ${err}`);
      return [];
    }
  }
}
