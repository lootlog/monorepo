import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

/** A failed adapter call, named by the operation that made it. */
export class OperationError extends TaggedErrorClass<
  OperationError,
  { readonly brand: unique symbol }
>()("OperationError", { operation: Schema.String, cause: Schema.Defect() }) {}

/** Traces one call to an external adapter (database, cache, broker, HTTP). */
export const withAdapterSpan =
  (
    operation: string,
    adapter: string,
    attributes?: Readonly<Record<string, string | number | boolean>>,
  ) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.withSpan(effect, operation, {
      attributes: { adapter, retryCount: 0, ...attributes },
    });

/**
 * Runs an adapter call in its span and reports any failure as an
 * `OperationError` for that operation. A failure that already is one keeps
 * the innermost operation name.
 */
export const adapterOperation =
  (adapter: string) =>
  <A, E, R>(
    operation: string,
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, OperationError, R> =>
    effect.pipe(
      Effect.mapError((cause) =>
        cause instanceof OperationError
          ? cause
          : new OperationError({ operation, cause }),
      ),
      withAdapterSpan(operation, adapter),
    );

/**
 * Runs a promise-returning adapter call and reports a rejection as an
 * `OperationError` for that operation. The rejection stays in `cause`.
 */
export const promiseOperation = <A>(
  operation: string,
  run: (signal: AbortSignal) => PromiseLike<A>,
): Effect.Effect<A, OperationError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new OperationError({ operation, cause }),
  });
