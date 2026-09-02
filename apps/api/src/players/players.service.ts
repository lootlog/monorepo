import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";

import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { CreatePlayerDto } from "#src/players/dto/create-player.dto";

export class PlayersService {
  constructor(private readonly amqpConnection: AmqpPublisher) {}

  bulkIndexPlayers(players: CreatePlayerDto[]) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_PLAYERS_INDEX,
      players,
    );
  }
}
