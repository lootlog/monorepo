import type { Meilisearch } from "meilisearch";
import { meilisearchClient } from "../lib/meilisearch.js";
import type { GetPlayersDto } from "./dto/get-players.dto.js";
import { PLAYERS_INDEX } from "./constants/meilisearch.js";

export class PlayersService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
  }

  async getPlayers({ limit, search }: GetPlayersDto) {
    const index = this.meilisearch.index(PLAYERS_INDEX);

    try {
      const data = await index.search(search, {
        limit,
        attributesToSearchOn: ["name"],
      });
      return data.hits;
    } catch (error) {
      return [];
    }
  }
}
