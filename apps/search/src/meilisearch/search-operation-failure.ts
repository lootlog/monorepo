import type { EnqueuedTaskPromise } from "meilisearch";
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

export const completeMeilisearchTask = (
  operation: string,
  run: () => EnqueuedTaskPromise,
) =>
  attemptMeilisearch(operation, async () => {
    const task = await run().waitTask({ interval: 15_000, timeout: 60_000 });

    if (task.status !== "succeeded") {
      throw (
        task.error ?? new Error(`Meilisearch task ${task.uid} ${task.status}`)
      );
    }

    return task;
  });
