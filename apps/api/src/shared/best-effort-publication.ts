import { Effect } from "effect";

/**
 * Settles a best-effort realtime publication without failing the request
 * that already committed its change. The failure is logged because the event
 * may be lost: some readers refetch stored state, others (such as a
 * volunteer notice) never see it, so a broker outage must stay visible.
 */
export const ignorePublicationFailure = Effect.ignore({
  log: "Warn",
  message: "Best-effort publication failed; realtime delivery may be lost",
});
