import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class OperationError extends TaggedErrorClass<
  OperationError,
  { readonly brand: unique symbol }
>()("OperationError", { operation: Schema.String, cause: Schema.Defect() }) {}

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

export const promiseOperation = <A>(
  operation: string,
  run: (signal: AbortSignal) => PromiseLike<A>,
): Effect.Effect<A, OperationError> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new OperationError({ operation, cause }),
  });
