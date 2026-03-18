import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";

export type IndexItemDto = {
  id: number;
  name: string;
  icon: string;
  lvl: number;
  rarity: string | null;
  type: string | null;
  world: string;
};

@Injectable()
export class ItemsService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  bulkIndexItems(items: IndexItemDto[]) {
    if (items.length === 0) return;

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_ITEMS_INDEX,
      items,
    );
  }
}
