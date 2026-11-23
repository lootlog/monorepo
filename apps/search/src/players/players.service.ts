import { indexChangedDocuments } from "@lootlog/meilisearch/projection";
import { Effect } from "effect";
import { partition } from "es-toolkit";
import type { Meilisearch } from "meilisearch";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "@lootlog/meilisearch/operation-failure";
import type { PlayerSearchQuery } from "./player-search-query.js";
import { playerNameQuery } from "./player-name-query.js";
import type { IndexPlayersCommand } from "./index-players-command.js";
import type { SearchPlayer } from "@lootlog/protocol/rabbit/events";

export const PLAYERS_INDEX = "players";

const uniquePlayers = (players: ReadonlyArray<SearchPlayer>) => {
  const unique = new Map<string, SearchPlayer>();

  for (const player of players) {
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

const toPlayerDocument = (player: IndexPlayer) => ({
  ...player,
  uid: `${player.id}_${player.name.replace(/[^a-zA-Z0-9_-]/g, "")}_${player.world}`,
});

export const makePlayersModule = (meilisearch: Meilisearch) => {
  const getPlayers = Effect.fn("SearchPlayers.get")(function* (
    input: PlayerSearchQuery,
  ) {
    const index = meilisearch.index<SearchPlayer>(PLAYERS_INDEX);
    const { searchTerm, query } = playerNameQuery(input);

    return yield* attemptMeilisearch("search.players", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map((response) => uniquePlayers(response.hits)),
      Effect.tapError((error) =>
        Effect.logError("Players search error", { error }),
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
      yield* Effect.logWarning(
        "No valid players to index (missing required fields)",
        { players: data.players },
      );

      return;
    }

    if (validPlayers.length !== data.players.length) {
      yield* Effect.logWarning(
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
    ) => Effect.Effect<ReadonlyArray<SearchPlayer>, SearchOperationFailure>;
    readonly indexPlayers: (
      data: IndexPlayersCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
  };
};
