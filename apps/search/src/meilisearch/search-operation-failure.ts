import { Effect, Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class SearchOperationFailure extends Schema.TaggedError<SearchOperationFailure>()(
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
