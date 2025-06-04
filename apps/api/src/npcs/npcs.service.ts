import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { CreateNpcDto } from 'src/npcs/dto/create-npc.dto';
import { RoutingKey } from 'src/npcs/enum/routing-key.enum';

@Injectable()
export class NpcsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async bulkIndexNpcs(npcs: CreateNpcDto[]) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_NPCS_INDEX,
      npcs,
    );
    return undefined;
  }
}
