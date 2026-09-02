import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";

export class SearchOperationFailure extends TaggedErrorClass<SearchOperationFailure>()(
  "SearchOperationFailure",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export const attemptMeilisearch = <A>(
  operation: string,
  run: () => PromiseLike<A>,
) =>
  Effect.tryPromise({
    try: () => Promise.resolve(run()),
    catch: (cause) => new SearchOperationFailure({ operation, cause }),
  }).pipe(
    Effect.withSpan(operation, {
      attributes: { adapter: "meilisearch", retryCount: 0 },
    }),
  );
