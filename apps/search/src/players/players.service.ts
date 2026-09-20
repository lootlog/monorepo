import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { Effect } from "effect";
import { partition } from "es-toolkit";
import type { Meilisearch, SearchParams } from "meilisearch";
import { buildMeilisearchSearchTermFilter } from "#src/meilisearch/query-builder";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import type { PlayerSearchQuery } from "./player-search-query.js";
import { PLAYERS_INDEX } from "./search-index.js";
import type { IndexPlayersCommand } from "./index-players-command.js";
import type { PlayerHit } from "./player-hit.js";

const uniquePlayers = (players: ReadonlyArray<PlayerHit>) => {
  const knownNames = new Set(
    players.flatMap((player) =>
      player.accountId > 0 ? [JSON.stringify([player.world, player.name])] : [],
    ),
  );

  const unique = new Map<string, PlayerHit>();

  for (const player of players) {
    // ponytail: name fallback for truncated legacy IDs; remove after an identity migration.
    if (
      player.accountId === 0 &&
      knownNames.has(JSON.stringify([player.world, player.name]))
    ) {
      continue;
    }

    const key = JSON.stringify([
      player.world,
      player.characterId > 0 ? player.characterId : [player.id, player.name],
    ]);

    const existing = unique.get(key);

    if (!existing || (existing.accountId === 0 && player.accountId > 0)) {
      unique.set(key, player);
    }
  }

  return [...unique.values()];
};

type IndexPlayer = IndexPlayersCommand["players"][number];

/** The stored shape of one player; the seed script and the consumer share it. */
export const toPlayerDocument = (player: IndexPlayer) => ({
  ...player,
  uid: `${player.id}_${player.name.replace(/[^a-zA-Z0-9_-]/g, "")}_${player.world}`,
});

export const makePlayersModule = (
  meilisearch: Meilisearch,
  logger: AppLogger,
) => {
  const getPlayers = Effect.fn("SearchPlayers.get")(function* ({
    limit,
    search,
    world,
  }: PlayerSearchQuery) {
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
      Effect.map((response) => uniquePlayers(response.hits)),
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Players search error", { error })),
      ),
    );
  });

  const indexPlayers = Effect.fn("SearchPlayers.index")(function* (
    data: IndexPlayersCommand,
  ) {
    const [validPlayers, invalidPlayers] = partition(data.players, (player) =>
      Boolean(player.world && player.id && player.name),
    );

    if (validPlayers.length === 0) {
      logger.warn("No valid players to index (missing required fields)", {
        players: data.players,
      });

      return;
    }

    if (validPlayers.length !== data.players.length) {
      logger.warn(
        `Skipped ${invalidPlayers.length} players due to missing required fields`,
        { invalidPlayers },
      );
    }

    const playersWithUid = validPlayers.map(toPlayerDocument);

    yield* indexChangedDocuments(
      meilisearch.index<(typeof playersWithUid)[number]>(PLAYERS_INDEX),
      playersWithUid,
    );
  });

  return { getPlayers, indexPlayers } satisfies {
    readonly getPlayers: (
      input: PlayerSearchQuery,
    ) => Effect.Effect<ReadonlyArray<PlayerHit>, SearchOperationFailure>;
    readonly indexPlayers: (
      data: IndexPlayersCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
  };
};
