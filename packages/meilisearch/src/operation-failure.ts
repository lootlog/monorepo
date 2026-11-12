import type { EnqueuedTaskPromise } from "meilisearch";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Predicate, Schema } from "effect";

export class SearchOperationFailure extends TaggedErrorClass<SearchOperationFailure>()(
  "SearchOperationFailure",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  },
) {}

const isInvalidRequest = (cause: unknown): boolean =>
  Predicate.hasProperty(cause, "type") && cause.type === "invalid_request";

/**
 * A Meilisearch rejection of the request itself, such as an invalid document:
 * repeating the same items can never succeed. Transport errors, timeouts and
 * internal or auth failures may pass and stay retryable.
 */
export const isPermanentSearchFailure = (
  error: SearchOperationFailure,
): boolean =>
  isInvalidRequest(error.cause) ||
  (Predicate.hasProperty(error.cause, "cause") &&
    isInvalidRequest(error.cause.cause));

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

export const completeMeilisearchTask = (
  operation: string,
  run: () => EnqueuedTaskPromise,
) =>
  attemptMeilisearch(operation, async () => {
    const task = await run().waitTask({ interval: 500, timeout: 60_000 });

    if (task.status !== "succeeded") {
      throw (
        task.error ?? new Error(`Meilisearch task ${task.uid} ${task.status}`)
      );
    }

    return task;
  });
