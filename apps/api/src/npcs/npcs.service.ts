import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";

import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { CreateNpcDto } from "#src/npcs/dto/create-npc.dto";

export class NpcsService {
  constructor(private readonly amqpConnection: AmqpPublisher) {}

  bulkIndexNpcs(npcs: CreateNpcDto[]) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_NPCS_INDEX,
      npcs,
    );
  }
}
