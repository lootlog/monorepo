import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import type { Meilisearch, SearchParams } from "meilisearch";
import type { z } from "zod";
import { MEILISEARCH_CLIENT } from "src/meilisearch/meilisearch.constants";
import { buildMeilisearchSearchTermFilter } from "src/meilisearch/meilisearch.utils";
import type { GetPlayersDto } from "./dto/get-players.dto";
import { PLAYERS_INDEX } from "./constants/meilisearch";
import type { IndexPlayersDto } from "./dto/index-players.dto";
import type { playerHitSchema } from "./dto/player-hit.schema";

type PlayerHit = z.infer<typeof playerHitSchema>;

@Injectable()
export class PlayersService {
  constructor(
    @Inject(MEILISEARCH_CLIENT) private readonly meilisearch: Meilisearch,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
