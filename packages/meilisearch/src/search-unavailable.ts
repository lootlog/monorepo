import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";

export class SearchUnavailable extends TaggedErrorClass<SearchUnavailable>()(
  "SearchUnavailable",
  { message: Schema.String },
) {}

/** A failed search is an explicit unavailable response, not an empty success. */
export const runSearchOperation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.mapError(
      () =>
        new SearchUnavailable({
          message: "Wyszukiwarka jest chwilowo niedostępna.",
        }),
    ),
  );
