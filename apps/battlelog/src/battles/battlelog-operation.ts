import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";

export class BattlelogOperationFailure extends TaggedErrorClass<BattlelogOperationFailure>()(
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
