import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import {
  applyPresenceUpdates,
  getPresenceKey,
  normalizePresence,
  normalizePresenceResponse,
  requestServerPresence,
  type PlayerPresence,
  type PlayerPresenceResponse,
  type PlayerPresenceUpdatePayload,
} from "@/lib/online-players-presence";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AsyncResourceState } from "@/types/async-resource-state";

export type OnlinePlayersAccessState = "allowed" | "forbidden";

export type PlayersPresenceState = AsyncResourceState & {
  accessState: OnlinePlayersAccessState;
  hasLoaded: boolean;
  onlinePlayers: PlayerPresenceResponse;
  setOnlinePlayers: Dispatch<SetStateAction<PlayerPresenceResponse>>;
};

export const usePlayersPresence = (
  selectedGuildId?: string,
  world?: string,
): PlayersPresenceState => {
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [accessState, setAccessState] =
    useState<OnlinePlayersAccessState>("allowed");
  const [requestVersion, setRequestVersion] = useState(0);
  const { joined, connected, socket } = useSocket();

  const selectedGuildIdRef = useRef(selectedGuildId);
  const worldRef = useRef(world);
  const visibleScopeRef = useRef({ guildId: selectedGuildId, world });
  const requestIdRef = useRef(0);
  const presenceUpdateControllerRef = useRef({
    pendingUpdates: new Map<string, PlayerPresence>(),
    frame: null as number | null,
  });

  useEffect(() => {
    selectedGuildIdRef.current = selectedGuildId;
    worldRef.current = world;
    const presenceUpdateController = presenceUpdateControllerRef.current;
    presenceUpdateController.pendingUpdates.clear();
    if (presenceUpdateController.frame !== null) {
      window.cancelAnimationFrame(presenceUpdateController.frame);
      presenceUpdateController.frame = null;
    }
  }, [selectedGuildId, world]);

  useEffect(() => {
    if (!selectedGuildId || !world) {
      requestIdRef.current += 1;
      visibleScopeRef.current = { guildId: selectedGuildId, world };
      setOnlinePlayers({});
      setLoading(false);
      setLoaded(false);
      setError(null);
      setAccessState("allowed");
      return;
    }

    const scopeChanged =
      visibleScopeRef.current.guildId !== selectedGuildId ||
      visibleScopeRef.current.world !== world;

    if (scopeChanged) {
      requestIdRef.current += 1;
      visibleScopeRef.current = { guildId: selectedGuildId, world };
      setOnlinePlayers({});
      setLoaded(false);
      setLoading(false);
      setError(null);
      setAccessState("allowed");
    }

    if (
      !joined ||
      !connected ||
      !socket ||
      !selectedGuildIdRef.current ||
      !world
    ) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    visibleScopeRef.current = { guildId: selectedGuildId, world };
    setAccessState("allowed");
    setError(null);
    setLoading(true);

    requestServerPresence(socket, selectedGuildIdRef.current, world)
      .then((data) => {
        // ignore stale responses
        if (requestIdRef.current !== currentRequestId) return;

        if (!data) {
          setError(new Error("Online players response was empty"));
          return;
        }

        if (data.status === "forbidden") {
          setOnlinePlayers({});
          setAccessState("forbidden");
          setLoaded(true);
          return;
        }

        setOnlinePlayers(normalizePresenceResponse(data.players));
        setLoaded(true);
      })
      .catch((requestError: unknown) => {
        if (requestIdRef.current !== currentRequestId) return;

        setError(requestError);
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      });
  }, [joined, connected, socket, world, selectedGuildId, requestVersion]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;
    const presenceUpdateController = presenceUpdateControllerRef.current;

    const handleOnlinePlayersPresenceUpdate = (
      data: PlayerPresenceUpdatePayload,
    ) => {
      const normalizedPresence = normalizePresence(data);

      if (
        normalizedPresence.guildId !== selectedGuildIdRef.current ||
        normalizedPresence.player?.world !== worldRef.current
      )
        return;

      const presenceKey = `${normalizedPresence.discordId}:${getPresenceKey(normalizedPresence)}`;
      presenceUpdateController.pendingUpdates.set(
        presenceKey,
        normalizedPresence,
      );
      if (presenceUpdateController.frame !== null) return;

      presenceUpdateController.frame = window.requestAnimationFrame(() => {
        presenceUpdateController.frame = null;
        const updates = [...presenceUpdateController.pendingUpdates.values()];
        presenceUpdateController.pendingUpdates.clear();
        setOnlinePlayers((previous) => applyPresenceUpdates(previous, updates));
      });
    };

    socket.on(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      handleOnlinePlayersPresenceUpdate,
    );

    return () => {
      presenceUpdateController.pendingUpdates.clear();
      if (presenceUpdateController.frame !== null) {
        window.cancelAnimationFrame(presenceUpdateController.frame);
        presenceUpdateController.frame = null;
      }
      socket.off(
        GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
        handleOnlinePlayersPresenceUpdate,
      );
    };
  }, [socket, joined, connected]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handlePermissionsUpdated = () => {
      setRequestVersion((version) => version + 1);
    };

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, joined, connected]);

  const hasScope = Boolean(selectedGuildId && world);

  return {
    accessState,
    error,
    hasLoaded: loaded,
    initialLoading: hasScope && !loaded && !error,
    onlinePlayers,
    refreshing: loading && loaded,
    retry: () => setRequestVersion((version) => version + 1),
    setOnlinePlayers,
    stale: hasScope && loaded && (!connected || !joined),
  };
};
