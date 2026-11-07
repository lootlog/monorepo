import { Effect } from "effect";
import type { Meilisearch, Settings } from "meilisearch";
import { getMeilisearchErrorCode } from "./query-builder.js";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
} from "./operation-failure.js";

const searchIndexSettingFields = [
  "filterableAttributes",
  "searchableAttributes",
  "sortableAttributes",
  "distinctAttribute",
  "faceting",
] as const;

/** The settings a service owns on one index; startup applies only these. */
export type IndexSettings = Pick<
  Settings,
  (typeof searchIndexSettingFields)[number]
>;

export const SEARCH_INDEX_PRIMARY_KEY = "uid";

type ConfigurationLogger = {
  readonly error: (message: string, context: { error: unknown }) => void;
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

/** Creates each index and applies its settings when they differ. */
export const configureMeilisearchIndexes = (
  meilisearch: Meilisearch,
  settings: Readonly<Record<string, IndexSettings>>,
  logger: ConfigurationLogger,
) =>
  Effect.gen(function* () {
    yield* Effect.all(
      Object.entries(settings).map(([indexName, desired]) =>
        Effect.gen(function* () {
          yield* ensureIndex(meilisearch, indexName, SEARCH_INDEX_PRIMARY_KEY);
          const index = meilisearch.index(indexName);

          const current = yield* attemptMeilisearch(
            "meilisearch.index.settings.get",
            () => index.getSettings(),
          );

          const changed = searchIndexSettingFields.some((field) => {
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
