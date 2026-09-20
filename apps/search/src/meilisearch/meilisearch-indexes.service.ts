import { Effect } from "effect";
import type { Meilisearch, Settings } from "meilisearch";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";
import { PLAYERS_INDEX } from "#src/players/search-index";
import type { AppLogger } from "#src/shared/logger";
import { getMeilisearchErrorCode } from "./query-builder.js";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "./search-operation-failure.js";

type IndexSettings = Record<
  typeof NPCS_INDEX | typeof PLAYERS_INDEX | typeof ITEMS_INDEX,
  Pick<
    Settings,
    | "filterableAttributes"
    | "searchableAttributes"
    | "sortableAttributes"
    | "distinctAttribute"
  >
>;

export const SEARCH_INDEX_PRIMARY_KEY = "uid";

/** The settings every index runs with; the seed script applies the same ones. */
export const searchIndexSettings: IndexSettings = {
  [NPCS_INDEX]: { filterableAttributes: ["name", "type", "world"] },
  [PLAYERS_INDEX]: { filterableAttributes: ["name", "world"] },
  [ITEMS_INDEX]: {
    filterableAttributes: [
      "world",
      "worlds",
      "type",
      "rarity",
      "lvl",
      "stats",
      "numericStats",
      "requiredProfessions",
      "statsKeys",
    ],
    searchableAttributes: ["name", "stat"],
    sortableAttributes: ["name", "lvl", "rarity", "type"],
    distinctAttribute: "id",
  },
};

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
      Object.entries(searchIndexSettings).map(([indexName, desired]) =>
        Effect.gen(function* () {
          yield* ensureIndex(meilisearch, indexName, SEARCH_INDEX_PRIMARY_KEY);
          const index = meilisearch.index(indexName);

          const current = yield* attemptMeilisearch(
            "meilisearch.index.settings.get",
            () => index.getSettings(),
          );

          const changed = (
            [
              "filterableAttributes",
              "searchableAttributes",
              "sortableAttributes",
              "distinctAttribute",
            ] as const
          ).some((field) => {
            // Searchable attribute order affects ranking; filter/sort sets do not.
            if (!(field in desired)) return false;
            const actual = current[field];
            const expected = desired[field];

            if (
              field !== "searchableAttributes" &&
              Array.isArray(actual) &&
              Array.isArray(expected)
            ) {
              return (
                JSON.stringify([...actual].sort()) !==
                JSON.stringify([...expected].sort())
              );
            }

            return JSON.stringify(actual) !== JSON.stringify(expected);
          });

          if (changed) {
            yield* completeMeilisearchTask(
              `meilisearch.index.configure.${indexName}`,
              () => index.updateSettings(desired),
            );
          }
        }),
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
