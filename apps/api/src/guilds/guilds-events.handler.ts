import {
  MessageHandlerErrorBehavior,
  RabbitSubscribe,
} from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { CreateGuildDto } from 'src/guilds/dto/create-guild.dto';
import { Queue } from 'src/guilds/enum/queue.enum';
import { RoutingKey } from 'src/guilds/enum/routing-key.enum';
import { GuildsService } from 'src/guilds/guilds.service';

@Injectable()
export class GuildsEventsHandler {
  constructor(private readonly guildsService: GuildsService) {}

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_CREATE,
    queue: Queue.GUILDS_CREATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildsCreate(data: CreateGuildDto) {
    this.guildsService.createGuild(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_UPDATE,
    queue: Queue.GUILDS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildsUpdate(data: CreateGuildDto) {
    this.guildsService.updateGuild(data);
  }

  @RabbitSubscribe({
    exchange: 'default',
    routingKey: RoutingKey.GUILDS_DELETE,
    queue: Queue.GUILDS_DELETE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
  })
  async handleGuildsDelete(data: CreateGuildDto) {
    this.guildsService.deleteGuild(data);
  }
}
