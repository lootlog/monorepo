import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { CreatePlayerDto } from 'src/players/dto/create-player.dto';

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
