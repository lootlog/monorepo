import { Effect, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class OperationError extends TaggedErrorClass<OperationError>()(
  "OperationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

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
