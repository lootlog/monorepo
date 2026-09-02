import { Effect } from "effect";
import type { Meilisearch, SearchParams } from "meilisearch";
import { buildMeilisearchSearchTermFilter } from "#src/meilisearch/meilisearch.utils";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import type { GetPlayersDto } from "./dto/get-players.dto.js";
import { PLAYERS_INDEX } from "./constants/meilisearch.js";
import type { IndexPlayersDto } from "./dto/index-players.dto.js";
import type { PlayerHit } from "./dto/player-hit.schema.js";

export const makePlayersModule = (
  meilisearch: Meilisearch,
  logger: AppLogger,
) => {
  const getPlayers = Effect.fn("SearchPlayers.get")(function* ({
    limit,
    search,
    world,
  }: GetPlayersDto) {
    const index = meilisearch.index<PlayerHit>(PLAYERS_INDEX);
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

    return yield* attemptMeilisearch("search.players", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map((response) => response.hits),
      Effect.catch((error) => {
        logger.error("Players search error", { error });
        return Effect.succeed([] as PlayerHit[]);
      }),
    );
  });

  const indexPlayers = Effect.fn("SearchPlayers.index")(function* (
    data: IndexPlayersDto,
  ) {
    const index = meilisearch.index(PLAYERS_INDEX);

    const validPlayers = data.players.filter(
      (player) => player.world && player.id && player.name,
    );

    if (validPlayers.length === 0) {
      logger.warn("No valid players to index (missing required fields)", {
        players: data.players,
      });
      return;
    }

    if (validPlayers.length !== data.players.length) {
      const invalidPlayers = data.players.filter(
        (player) => !player.world || !player.id || !player.name,
      );
      logger.warn(
        `Skipped ${invalidPlayers.length} players due to missing required fields`,
        { invalidPlayers },
      );
    }

    const playersWithUid = validPlayers.map((player) => ({
      ...player,
      uid: `${player.id}_${player.name.replace(/[^a-zA-Z0-9_-]/g, "")}_${player.world}`,
    }));

    yield* attemptMeilisearch("search.players.index", () =>
      index.addDocuments(playersWithUid, { primaryKey: "uid" }),
    );
  });

  return { getPlayers, indexPlayers } satisfies {
    readonly getPlayers: (
      input: GetPlayersDto,
    ) => Effect.Effect<ReadonlyArray<PlayerHit>>;
    readonly indexPlayers: (
      data: IndexPlayersDto,
    ) => Effect.Effect<void, SearchOperationFailure>;
  };
};
