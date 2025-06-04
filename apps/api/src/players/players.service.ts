import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { CreatePlayerDto } from 'src/players/dto/create-player.dto';
import { RoutingKey } from 'src/players/enum/routing-key.enum';

@Injectable()
export class PlayersService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  async bulkIndexPlayers(players: CreatePlayerDto[]) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.SEARCH_PLAYERS_INDEX,
      players,
    );

    return undefined;
  }
}
