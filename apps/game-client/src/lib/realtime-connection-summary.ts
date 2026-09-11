/**
 * One reading of the realtime gateway for every indicator in the client, so
 * the timers dot and the settings status row can never disagree.
 */
export type RealtimeConnectionSummary =
  | "connected"
  | "joining"
  | "disconnected";

export const summarizeRealtimeConnection = (socketState: {
  connected: boolean;
  joined: boolean;
  joinedGuilds: readonly string[];
}): RealtimeConnectionSummary => {
  if (!socketState.connected) return "disconnected";

  return socketState.joined && socketState.joinedGuilds.length > 0
    ? "connected"
    : "joining";
};
