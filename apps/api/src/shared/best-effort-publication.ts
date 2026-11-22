import { Effect } from "effect";

export const ignorePublicationFailure = Effect.ignore({
  log: "Warn",
  message: "Best-effort publication failed; realtime delivery may be lost",
});
