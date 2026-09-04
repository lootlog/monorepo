import { Effect } from "effect";
import type { SearchOperationFailure } from "#src/meilisearch/search-operation-failure";
import { SearchUnavailable } from "../contracts/search-unavailable.js";

export const runSearchOperation = <A, R>(
  effect: Effect.Effect<A, SearchOperationFailure, R>,
) =>
  effect.pipe(
    Effect.mapError(
      () =>
        new SearchUnavailable({
          message: "Wyszukiwarka jest chwilowo niedostępna.",
        }),
    ),
  );
