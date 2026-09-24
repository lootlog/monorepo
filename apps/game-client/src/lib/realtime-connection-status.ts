import type { RealtimeConnectionState } from "@lootlog/client/realtime";

/**
 * One reading of the realtime gateway for every place that shows it, so the
 * windows, the quick access dot and the settings row never disagree.
 *
 * - `connecting`: the first connection of this page is still in progress.
 * - `unreachable`: the first connection failed and the client keeps retrying.
 * - `reconnecting`: an established connection dropped and is being restored.
 */
export type RealtimeConnectionStatus =
  | "online"
  | "connecting"
  | "unreachable"
  | "reconnecting";

export const resolveRealtimeConnectionStatus = ({
  connected,
  hasBeenOnline,
  joined,
  state,
}: {
  connected: boolean;
  /** The session joined at least once since the page loaded. */
  hasBeenOnline: boolean;
  joined: boolean;
  state: RealtimeConnectionState;
}): RealtimeConnectionStatus => {
  if (connected && joined) return "online";

  if (hasBeenOnline) return "reconnecting";

  return state === "reconnecting" ? "unreachable" : "connecting";
};
