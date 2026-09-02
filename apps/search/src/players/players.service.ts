import type { Meilisearch, SearchParams } from "meilisearch";
import { buildMeilisearchSearchTermFilter } from "#src/meilisearch/meilisearch.utils";
import type { AppLogger } from "#src/shared/logger";
import type { GetPlayersDto } from "./dto/get-players.dto.js";
import { PLAYERS_INDEX } from "./constants/meilisearch.js";
import type { IndexPlayersDto } from "./dto/index-players.dto.js";
import type { PlayerHit } from "./dto/player-hit.schema.js";

export class PlayersService {
  constructor(
    private readonly meilisearch: Meilisearch,
    private readonly logger: AppLogger,
  ) {}

  async getPlayers({ limit, search, world }: GetPlayersDto) {
    const index = this.meilisearch.index<PlayerHit>(PLAYERS_INDEX);
    const { filter: searchFilter, searchTerm } =
      buildMeilisearchSearchTermFilter("name", search);

    const filters: string[] = [];

    if (searchFilter) {
      filters.push(searchFilter);
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
      this.logger.error("Players search error", { error });
      return [];
    }
  }

  async indexPlayers(data: IndexPlayersDto) {
    const index = this.meilisearch.index(PLAYERS_INDEX);

    const validPlayers = data.players.filter(
      (player) => player.world && player.id && player.name,
    );

    if (validPlayers.length === 0) {
      this.logger.warn("No valid players to index (missing required fields)", {
        players: data.players,
      });
      return;
    }

    if (validPlayers.length !== data.players.length) {
      const invalidPlayers = data.players.filter(
        (player) => !player.world || !player.id || !player.name,
      );
      this.logger.warn(
        `Skipped ${invalidPlayers.length} players due to missing required fields`,
        { invalidPlayers },
      );
    }

    const playersWithUid = validPlayers.map((player) => ({
      ...player,
      uid: `${player.id}_${player.name.replace(/[^a-zA-Z0-9_-]/g, "")}_${player.world}`,
    }));

    try {
      return await index.addDocuments(playersWithUid, { primaryKey: "uid" });
    } catch (error) {
      this.logger.error("Error indexing players", { error });
    }
  }
}
