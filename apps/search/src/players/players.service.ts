import type { Meilisearch, SearchParams } from "meilisearch";
import type { z } from "zod";
import { meilisearchClient } from "../lib/meilisearch.js";
import { logger } from "../config/winston.config.js";
import { validateIndexableItems } from "../lib/utils/validate-indexable-items.js";
import type { GetPlayersDto } from "./dto/get-players.dto.js";
import { PLAYERS_INDEX } from "./constants/meilisearch.js";
import type { IndexPlayersDto } from "./dto/index-players.dto.js";
import type { playerHitSchema } from "./dto/player-hit.schema.js";

type PlayerHit = z.infer<typeof playerHitSchema>;

export class PlayersService {
  meilisearch: Meilisearch;

  constructor() {
    this.meilisearch = meilisearchClient;
    const index = this.meilisearch.index(PLAYERS_INDEX);
    index.updateFilterableAttributes(["name", "world"]);
  }

  async getPlayers({ limit, search, world }: GetPlayersDto) {
    const index = this.meilisearch.index<PlayerHit>(PLAYERS_INDEX);
    const hasMultipleSearchTerms = Array.isArray(search);
    const searchTerm = hasMultipleSearchTerms ? "" : search;

    const filters: string[] = [];

    if (hasMultipleSearchTerms) {
      filters.push(`name IN [${search.map((n) => `"${n}"`).join(", ")}]`);
    }

    if (world) {
      filters.push(`world = "${world}"`);
    }

    const query: SearchParams = {
      limit,
      attributesToSearchOn: ["name"],
      ...(filters.length > 0 && { filter: filters.join(" AND ") }),
    };

    try {
      const data = await index.search(searchTerm, query);

      return data.hits;
    } catch (error) {
      logger.error("Players search error", { error });
      return [];
    }
  }

  async indexPlayers(data: IndexPlayersDto) {
    const index = this.meilisearch.index(PLAYERS_INDEX);

    const validPlayers = validateIndexableItems(
      data.players,
      "players",
      logger,
    );
    if (!validPlayers) return;

    const playersWithUid = validPlayers.map((player) => ({
      ...player,
      uid: `${player.id}_${player.name.replace(/[^a-zA-Z0-9_-]/g, "")}_${player.world}`,
    }));

    try {
      return index.addDocuments(playersWithUid, { primaryKey: "uid" });
    } catch (error) {
      logger.error("Error indexing players", { error });
    }
  }
}
