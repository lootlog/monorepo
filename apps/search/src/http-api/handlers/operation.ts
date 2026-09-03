import { Effect } from "effect";

export const runSearchOperation = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, Effect.die);
