import { Inject, Injectable } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import { PLAYERS_INDEX } from 'src/players/config/meilisearch.config';
import { CreatePlayerDto } from 'src/players/dto/create-player.dto';
import { FetchGuildPlayersDto } from 'src/players/dto/fetch-guild-players.dto';

@Injectable()
export class PlayersService {
  constructor(
    @Inject('MeiliSearch') private readonly meilisearch: Meilisearch,
  ) {}

  async getPlayers(query: FetchGuildPlayersDto) {
    const limit = parseInt(query.limit ?? '10', 10);
    const search = query.search ?? undefined;

    const index = this.meilisearch.index(PLAYERS_INDEX);

    try {
      const data = await index.search(search, {
        limit,
        attributesToSearchOn: ['name'],
      });
      return data.hits;
    } catch (error) {
      return [];
    }
  }

  async bulkIndexPlayers(players: CreatePlayerDto[]) {
    const res = await this.meilisearch
      .index(PLAYERS_INDEX)
      .addDocuments(
        players.map((player) => ({
          id: Number(player.id),
          name: player.name,
          icon: player.icon,
        })),
      );

    return res;
  }

  async verifyIndex() {
    try {
      await this.meilisearch.getIndex(PLAYERS_INDEX);
    } catch (error) {
      await this.meilisearch.createIndex(PLAYERS_INDEX);
    }
  }
}
