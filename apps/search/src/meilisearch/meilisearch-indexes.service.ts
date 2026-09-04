import { Effect } from "effect";
import type { Meilisearch } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";
import { PLAYERS_INDEX } from "#src/players/search-index";
import type { AppLogger } from "#src/shared/logger";
import { getMeilisearchErrorCode } from "./query-builder.js";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "./search-operation-failure.js";

const itemFilterableAttributes = [
  "world",
  "worlds",
  "type",
  "rarity",
  "lvl",
  "stats",
  "numericStats",
  "requiredProfessions",
  "statsKeys",
];

const indexPrimaryKeys = {
  [NPCS_INDEX]: "uid",
  [PLAYERS_INDEX]: "uid",
  [ITEMS_INDEX]: "uid",
} as const;

const ensureIndex = (
  meilisearch: Meilisearch,
  indexName: string,
  primaryKey: string,
) =>
  attemptMeilisearch("meilisearch.index.get", () =>
    meilisearch.getIndex(indexName),
  ).pipe(
    Effect.catch((error) => {
      if (getMeilisearchErrorCode(error.cause) !== "index_not_found") {
        return Effect.fail(error);
      }
      return completeMeilisearchTask("meilisearch.index.create", () =>
        meilisearch.createIndex(indexName, { primaryKey }),
      );
    }),
    Effect.asVoid,
  );

export const configureMeilisearchIndexes = (
  meilisearch: Meilisearch,
  logger: AppLogger,
) =>
  Effect.gen(function* () {
    yield* Effect.all(
      Object.entries(indexPrimaryKeys).map(([indexName, primaryKey]) =>
        ensureIndex(meilisearch, indexName, primaryKey),
      ),
      { concurrency: "unbounded", discard: true },
    );

    const configure = [
      () =>
        meilisearch
          .index(NPCS_INDEX)
          .updateFilterableAttributes(["name", "type", "world"]),
      () =>
        meilisearch
          .index(PLAYERS_INDEX)
          .updateFilterableAttributes(["name", "world"]),
      () =>
        meilisearch
          .index(ITEMS_INDEX)
          .updateFilterableAttributes(itemFilterableAttributes),
      () =>
        meilisearch
          .index(ITEMS_INDEX)
          .updateSearchableAttributes(["name", "stat"]),
      () =>
        meilisearch
          .index(ITEMS_INDEX)
          .updateSortableAttributes(["name", "lvl", "rarity", "type"]),
      () => meilisearch.index(ITEMS_INDEX).updateDistinctAttribute("id"),
    ];
    yield* Effect.all(
      configure.map((configureIndex, index) =>
        completeMeilisearchTask(`meilisearch.index.configure.${index}`, () =>
          configureIndex(),
        ),
      ),
      { concurrency: "unbounded", discard: true },
    );
  }).pipe(
    Effect.tapError((error) =>
      Effect.sync(() =>
        logger.error("Failed to configure Meilisearch indexes", { error }),
      ),
    ),
  );
