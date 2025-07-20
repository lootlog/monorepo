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
  async getUserGuilds(data: { discordId: string; userId: string }) {
    if (!data.discordId || !data.userId) {
      return [];
    }

    const guilds = await this.guildsService.getUserGuilds(
      data.discordId,
      data.userId,
    );

    console.log(
      `RPC: getUserGuilds - discordId: ${data.discordId}, userId: ${data.userId}, guilds: ${guilds.length}`,
    );

    const guildIds = guilds.map((guild) => guild.id);
    const guildsWithPermissions =
      await this.guildsService.getMultipleGuildsPermissions(
        data.discordId,
        guildIds,
      );

    console.log(
      `RPC: getUserGuilds - discordId: ${data.discordId}, userId: ${data.userId}, guildsWithPermissions: ${guildsWithPermissions.length}`,
    );

    return guildsWithPermissions;
  }
}
