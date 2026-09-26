import { useSocket } from "@/contexts/socket-context";
import {
  emptyPlayersPresenceSnapshot,
  getPlayersPresenceSource,
} from "@/lib/players-presence-source";
import type { PlayerPresenceResponse } from "@/lib/online-players-presence";
import {
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AsyncResourceState } from "@/types/async-resource-state";

export type OnlinePlayersAccessState = "allowed" | "forbidden";

export type PlayersPresenceState = AsyncResourceState & {
  accessState: OnlinePlayersAccessState;
  disconnected: boolean;
  hasLoaded: boolean;
  isCurrent: boolean;
  onlinePlayers: PlayerPresenceResponse;
  setOnlinePlayers: Dispatch<SetStateAction<PlayerPresenceResponse>>;
};

const emptySnapshot = () => emptyPlayersPresenceSnapshot;

const subscribeEmpty = () => () => {};

export const usePlayersPresence = (
  selectedGuildId?: string,
  world?: string,
): PlayersPresenceState => {
  const { socket, status } = useSocket();

  const source =
    socket && selectedGuildId && world
      ? getPlayersPresenceSource(socket, selectedGuildId, world)
      : undefined;

  const snapshot = useSyncExternalStore(
    source?.subscribe ?? subscribeEmpty,
    source?.getSnapshot ?? emptySnapshot,
  );

  const awaitingFirstSnapshot =
    Boolean(selectedGuildId && world) && !snapshot.hasLoaded && !snapshot.error;

  const disconnected =
    awaitingFirstSnapshot &&
    (status === "reconnecting" || status === "unreachable");

  return {
    ...snapshot,
    disconnected,
    refreshing: snapshot.refreshing && snapshot.hasLoaded,
    initialLoading: awaitingFirstSnapshot && !disconnected,
    retry: () => {
      void source?.refresh();
    },
    setOnlinePlayers: (update) => source?.setPlayers(update),
  };
};
