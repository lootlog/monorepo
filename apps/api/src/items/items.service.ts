import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";

import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";

type IndexItemDto = {
  id: number;
  name: string;
  icon: string;
  stat: string;
  lvl: number;
  rarity: string | null;
  type: string | null;
  world: string;
};

export class ItemsService {
  constructor(private readonly amqpConnection: AmqpPublisher) {}

  bulkIndexItems(items: IndexItemDto[]) {
    if (items.length === 0) return;

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_ITEMS_INDEX,
      items,
    );
  }
}
