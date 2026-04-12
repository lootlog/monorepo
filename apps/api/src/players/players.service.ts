import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import type { CreatePlayerDto } from "src/players/dto/create-player.dto";

@Injectable()
export class PlayersService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  bulkIndexPlayers(players: CreatePlayerDto[]) {
    if (players.length === 0) return;
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_PLAYERS_INDEX,
      players,
    );
  }
}
