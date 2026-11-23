import { Effect } from "effect";

export const withEventAdapterSpan = (adapter: string) =>
  Effect.withSpan(`events.adapter.${adapter}`);
