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
  useEffectEvent,
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

type PresenceResource = {
  accessState: OnlinePlayersAccessState;
  error: unknown;
  loaded: boolean;
  loading: boolean;
  onlinePlayers: PlayerPresenceResponse;
  scopeKey: string | null;
};

const createEmptyPresenceResource = (
  scopeKey: string | null,
): PresenceResource => ({
  accessState: "allowed",
  error: null,
  loaded: false,
  loading: false,
  onlinePlayers: {},
  scopeKey,
});

export const usePlayersPresence = (
  selectedGuildId?: string,
  world?: string,
): PlayersPresenceState => {
  const scopeKey =
    selectedGuildId && world ? JSON.stringify([selectedGuildId, world]) : null;
  const [presenceResource, setPresenceResource] = useState(() =>
    createEmptyPresenceResource(scopeKey),
  );
  const [requestVersion, setRequestVersion] = useState(0);
  const { joined, connected, socket } = useSocket();
  const visiblePresenceResource =
    presenceResource.scopeKey === scopeKey
      ? presenceResource
      : createEmptyPresenceResource(scopeKey);
  const setOnlinePlayers: Dispatch<SetStateAction<PlayerPresenceResponse>> = (
    update,
  ) => {
    setPresenceResource((currentResource) => {
      const scopedResource =
        currentResource.scopeKey === scopeKey
          ? currentResource
          : createEmptyPresenceResource(scopeKey);
      const nextOnlinePlayers =
        typeof update === "function"
          ? update(scopedResource.onlinePlayers)
          : update;
      return { ...scopedResource, onlinePlayers: nextOnlinePlayers };
    });
  };
  const updateOnlinePlayersForCurrentScope = useEffectEvent(
    (update: (current: PlayerPresenceResponse) => PlayerPresenceResponse) => {
      setPresenceResource((currentResource) => {
        const scopedResource =
          currentResource.scopeKey === scopeKey
            ? currentResource
            : createEmptyPresenceResource(scopeKey);
        return {
          ...scopedResource,
          onlinePlayers: update(scopedResource.onlinePlayers),
        };
      });
    },
  );

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
      return;
    }

    const scopeChanged =
      visibleScopeRef.current.guildId !== selectedGuildId ||
      visibleScopeRef.current.world !== world;

    if (scopeChanged) {
      requestIdRef.current += 1;
      visibleScopeRef.current = { guildId: selectedGuildId, world };
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

    requestServerPresence(socket, selectedGuildIdRef.current, world)
      .then((data) => {
        // ignore stale responses
        if (requestIdRef.current !== currentRequestId) return;

        if (!data) {
          setPresenceResource({
            ...createEmptyPresenceResource(scopeKey),
            error: new Error("Online players response was empty"),
          });
          return;
        }

        if (data.status === "forbidden") {
          setPresenceResource({
            ...createEmptyPresenceResource(scopeKey),
            accessState: "forbidden",
            loaded: true,
          });
          return;
        }

        setPresenceResource({
          ...createEmptyPresenceResource(scopeKey),
          loaded: true,
          onlinePlayers: normalizePresenceResponse(data.players),
        });
      })
      .catch((requestError: unknown) => {
        if (requestIdRef.current !== currentRequestId) return;

        setPresenceResource({
          ...createEmptyPresenceResource(scopeKey),
          error: requestError,
        });
      });
  }, [
    joined,
    connected,
    socket,
    world,
    selectedGuildId,
    requestVersion,
    scopeKey,
  ]);

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
        updateOnlinePlayersForCurrentScope((previous) =>
          applyPresenceUpdates(previous, updates),
        );
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
  }, [socket, joined, connected, scopeKey]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    const handlePermissionsUpdated = () => {
      setPresenceResource((currentResource) => {
        const scopedResource =
          currentResource.scopeKey === scopeKey
            ? currentResource
            : createEmptyPresenceResource(scopeKey);
        return {
          ...scopedResource,
          accessState: "allowed",
          error: null,
          loading: true,
        };
      });
      setRequestVersion((version) => version + 1);
    };

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, joined, connected, scopeKey]);

  const hasScope = Boolean(selectedGuildId && world);

  return {
    accessState: visiblePresenceResource.accessState,
    error: visiblePresenceResource.error,
    hasLoaded: visiblePresenceResource.loaded,
    initialLoading:
      hasScope &&
      !visiblePresenceResource.loaded &&
      !visiblePresenceResource.error,
    onlinePlayers: visiblePresenceResource.onlinePlayers,
    refreshing:
      visiblePresenceResource.loading && visiblePresenceResource.loaded,
    retry: () => {
      setPresenceResource((currentResource) => {
        const scopedResource =
          currentResource.scopeKey === scopeKey
            ? currentResource
            : createEmptyPresenceResource(scopeKey);
        return {
          ...scopedResource,
          accessState: "allowed",
          error: null,
          loading: true,
        };
      });
      setRequestVersion((version) => version + 1);
    },
    setOnlinePlayers,
    stale:
      hasScope && visiblePresenceResource.loaded && (!connected || !joined),
  };
};
