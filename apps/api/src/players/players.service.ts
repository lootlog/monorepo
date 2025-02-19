import { Injectable } from '@nestjs/common';
import { CreatePlayerDto } from 'src/players/dto/create-player.dto';
import { FetchGuildPlayersDto } from 'src/players/dto/fetch-guild-players.dto';

@Injectable()
export class PlayersService {
  constructor() {}

  async getPlayers(query: FetchGuildPlayersDto) {
    return [];
  }

  async bulkIndexPlayers(players: CreatePlayerDto[]) {
    return undefined;
  }
}
