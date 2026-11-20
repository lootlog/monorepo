import { Effect } from "effect";

export const runPromiseAdapter = <A>(
  adapter: string,
  operation: () => Promise<A>,
) =>
  Effect.tryPromise({ try: operation, catch: (cause) => cause }).pipe(
    Effect.withSpan(`events.adapter.${adapter}`),
  );

export const withEventAdapterSpan = (adapter: string) =>
  Effect.withSpan(`events.adapter.${adapter}`);
