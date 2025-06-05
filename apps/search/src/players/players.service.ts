import type { Meilisearch, SearchParams } from "meilisearch";
import { meilisearchClient } from "../lib/meilisearch.js";
import type { GetPlayersDto } from "./dto/get-players.dto.js";
import { PLAYERS_INDEX } from "./constants/meilisearch.js";
import type { IndexPlayersDto } from "./dto/index-players.dto.js";

export class PlayersService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
    const index = this.meilisearch.index(PLAYERS_INDEX);
    index.updateFilterableAttributes(["name"]);
  }

  async getPlayers({ limit, search }: GetPlayersDto) {
    const index = this.meilisearch.index(PLAYERS_INDEX);
    const hasMultipleSearchTerms = Array.isArray(search);
    const searchTerm = hasMultipleSearchTerms ? "" : search;

    const query: SearchParams = {
      limit,
      attributesToSearchOn: ["name"],
    };

    if (hasMultipleSearchTerms) {
      query.filter = `name IN [${search.map((n) => `"${n}"`).join(", ")}]`;
    }

    try {
      const data = await index.search(searchTerm as string, query);

      return data.hits;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async indexPlayers(data: IndexPlayersDto) {
    const index = this.meilisearch.index(PLAYERS_INDEX);

    try {
      return index.addDocuments(data.players, { primaryKey: "id" });
    } catch (error) {
      console.error("Error indexing players:", error);
      return;
    }
  }
}
