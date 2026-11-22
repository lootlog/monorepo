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

export type IndexSettings = Pick<
  Settings,
  (typeof searchIndexSettingFields)[number]
>;

export const SEARCH_INDEX_PRIMARY_KEY = "uid";

export const ensureIndex = (meilisearch: Meilisearch, indexName: string) =>
  attemptMeilisearch("meilisearch.index.get", () =>
    meilisearch.getIndex(indexName),
  ).pipe(
    Effect.catch((error) => {
      if (getMeilisearchErrorCode(error.cause) !== "index_not_found") {
        return Effect.fail(error);
      }

      return completeMeilisearchTask("meilisearch.index.create", () =>
        meilisearch.createIndex(indexName, {
          primaryKey: SEARCH_INDEX_PRIMARY_KEY,
        }),
      );
    }),
    Effect.asVoid,
  );

export const configureMeilisearchIndexes = (
  meilisearch: Meilisearch,
  settings: Readonly<Record<string, IndexSettings>>,
) =>
  Effect.gen(function* () {
    yield* Effect.all(
      Object.entries(settings).map(([indexName, desired]) =>
        Effect.gen(function* () {
          yield* ensureIndex(meilisearch, indexName);
          const index = meilisearch.index(indexName);

          const current = yield* attemptMeilisearch(
            "meilisearch.index.settings.get",
            () => index.getSettings(),
          );

          const changed = searchIndexSettingFields.some((field) => {
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
      Effect.logError("Failed to configure Meilisearch indexes", { error }),
    ),
  );
