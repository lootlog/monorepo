import { Effect, Schema } from "effect";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class BattlelogOperationFailure extends Schema.TaggedError<BattlelogOperationFailure>()(
  "BattlelogOperationFailure",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const battlelogOperation =
  <Arguments extends readonly unknown[], A, E>(
    operation: string,
    run: (...arguments_: Arguments) => Effect.Effect<A, E>,
  ) =>
  (...arguments_: Arguments) =>
    run(...arguments_).pipe(
      Effect.mapError((cause) =>
        cause instanceof BattlelogOperationFailure
          ? cause
          : new BattlelogOperationFailure({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "battlelog", retryCount: 0 },
      }),
    );
