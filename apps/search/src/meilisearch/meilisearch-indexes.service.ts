import { Effect } from "effect";
import type { Meilisearch } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";
import { PLAYERS_INDEX } from "#src/players/search-index";
import type { AppLogger } from "#src/shared/logger";
import { getMeilisearchErrorCode } from "./query-builder.js";
import { attemptMeilisearch } from "./search-operation-failure.js";

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
      return attemptMeilisearch("meilisearch.index.create", () =>
        meilisearch.createIndex(indexName, { primaryKey }).waitTask(),
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
          .updateFilterableAttributes(["name", "type", "world"])
          .waitTask(),
      () =>
        meilisearch
          .index(PLAYERS_INDEX)
          .updateFilterableAttributes(["name", "world"])
          .waitTask(),
      () =>
        meilisearch
          .index(ITEMS_INDEX)
          .updateFilterableAttributes(itemFilterableAttributes)
          .waitTask(),
      () =>
        meilisearch
          .index(ITEMS_INDEX)
          .updateSearchableAttributes(["name", "stat"])
          .waitTask(),
      () =>
        meilisearch
          .index(ITEMS_INDEX)
          .updateSortableAttributes(["name", "lvl", "rarity", "type"])
          .waitTask(),
      () =>
        meilisearch.index(ITEMS_INDEX).updateDistinctAttribute("id").waitTask(),
    ];
    yield* Effect.all(
      configure.map((configureIndex, index) =>
        attemptMeilisearch(`meilisearch.index.configure.${index}`, () =>
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
