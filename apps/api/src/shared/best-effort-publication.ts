import { Effect } from "effect";

/**
 * Settles a realtime publication whose state is already stored, so readers
 * catch up on their next fetch. The failure is still logged: a broker outage
 * must stay visible instead of silently leaving clients stale.
 */
export const ignorePublicationFailure = Effect.ignore({
  log: "Warn",
  message: "Best-effort publication failed; readers catch up on next fetch",
});
