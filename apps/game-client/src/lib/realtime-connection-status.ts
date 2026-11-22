import type { RealtimeConnectionState } from "@lootlog/client/realtime";

export type RealtimeConnectionStatus =
  | "online"
  | "connecting"
  | "unreachable"
  | "reconnecting";

export const resolveRealtimeConnectionStatus = ({
  connected,
  hasBeenOnline,
  joined,
  joinFailed = false,
  state,
}: {
  connected: boolean;
  hasBeenOnline: boolean;
  joined: boolean;
  joinFailed?: boolean;
  state: RealtimeConnectionState;
}): RealtimeConnectionStatus => {
  if (connected && joined) return "online";

  if (hasBeenOnline) return "reconnecting";

  return state === "reconnecting" || joinFailed ? "unreachable" : "connecting";
};
