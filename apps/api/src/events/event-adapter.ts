import { promiseOperation } from "@lootlog/instrumentation/operation";
import { Effect } from "effect";

export const runPromiseAdapter = <A>(
  adapter: string,
  operation: () => Promise<A>,
) =>
  promiseOperation(`events.adapter.${adapter}`, operation).pipe(
    Effect.withSpan(`events.adapter.${adapter}`),
  );

export const withEventAdapterSpan = (adapter: string) =>
  Effect.withSpan(`events.adapter.${adapter}`);
