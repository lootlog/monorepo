import { GatewayEvent } from "@/config/gateway";
import { useSocket } from "@/contexts/socket-context";
import {
  applyPresenceUpdates,
  canReadPresence,
  filterPresenceByPolicy,
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
import type { PermissionsUpdatedPayload } from "@/lib/socket";
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
  const policy = socket?.getAccessPolicy?.();

  const forbidden =
    policy &&
    !canReadPresence(
      policy.organizations.find(
        (organization) => organization.organizationId === selectedGuildId,
      ),
    );

  let visiblePresenceResource =
    presenceResource.scopeKey === scopeKey
      ? presenceResource
      : createEmptyPresenceResource(scopeKey);

  if (forbidden)
    visiblePresenceResource = {
      ...createEmptyPresenceResource(scopeKey),
      accessState: "forbidden",
      loaded: true,
    };

  const setOnlinePlayers: Dispatch<SetStateAction<PlayerPresenceResponse>> = (
    update,
  ) => {
    setPresenceResource(function applyOnlinePlayersUpdate(currentResource) {
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

  const policyRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const presenceUpdateControllerRef = useRef<{
    pendingUpdates: Map<string, PlayerPresence>;
    frame: number | null;
  }>({
    pendingUpdates: new Map<string, PlayerPresence>(),
    frame: null,
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

    const policy = socket.getAccessPolicy?.();

    if (
      policy &&
      !canReadPresence(
        policy.organizations.find(
          (organization) => organization.organizationId === selectedGuildId,
        ),
      )
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
          setPresenceResource((current) => ({
            ...(current.scopeKey === scopeKey
              ? current
              : createEmptyPresenceResource(scopeKey)),
            loading: false,
            error: new Error("Online players response was empty"),
          }));

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
      .catch((cause: unknown) => {
        if (requestIdRef.current !== currentRequestId) return;

        setPresenceResource((current) => ({
          ...(current.scopeKey === scopeKey
            ? current
            : createEmptyPresenceResource(scopeKey)),
          loading: false,
          error: cause,
        }));
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
      const snapshot = socket.getAccessPolicy?.();

      const organization = snapshot?.organizations.find(
        (entry) => entry.organizationId === selectedGuildIdRef.current,
      );

      const allowedPresence = snapshot
        ? filterPresenceByPolicy(
            { [normalizedPresence.discordId]: [normalizedPresence] },
            organization,
          )[normalizedPresence.discordId]?.[0]
        : normalizedPresence;

      if (!allowedPresence) {
        updateOnlinePlayersForCurrentScope((previous) =>
          filterPresenceByPolicy(previous, organization),
        );

        return;
      }

      if (
        normalizedPresence.guildId !== selectedGuildIdRef.current ||
        (normalizedPresence.player?.world !== worldRef.current &&
          !(
            normalizedPresence.status === "offline" &&
            normalizedPresence.sessionId &&
            !normalizedPresence.player
          ))
      )
        return;

      const updateKey =
        normalizedPresence.status === "offline" && normalizedPresence.sessionId
          ? `session:${normalizedPresence.sessionId}`
          : getPresenceKey(normalizedPresence);

      const presenceKey = `${normalizedPresence.discordId}:${updateKey}`;
      // Keep coalesced updates in receive order relative to session removals.
      presenceUpdateController.pendingUpdates.delete(presenceKey);
      presenceUpdateController.pendingUpdates.set(presenceKey, allowedPresence);

      if (presenceUpdateController.frame !== null) return;

      presenceUpdateController.frame = window.requestAnimationFrame(() => {
        presenceUpdateController.frame = null;
        const updates = [...presenceUpdateController.pendingUpdates.values()];
        presenceUpdateController.pendingUpdates.clear();
        updateOnlinePlayersForCurrentScope((previous) => {
          const next = applyPresenceUpdates(previous, updates);
          const currentPolicy = socket.getAccessPolicy?.();

          return currentPolicy
            ? filterPresenceByPolicy(
                next,
                currentPolicy.organizations.find(
                  (entry) =>
                    entry.organizationId === selectedGuildIdRef.current,
                ),
              )
            : next;
        });
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

  const retry = () => {
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

  const schedulePolicyRefresh = () => {
    if (policyRefreshTimerRef.current !== null)
      clearTimeout(policyRefreshTimerRef.current);
    policyRefreshTimerRef.current = setTimeout(() => {
      policyRefreshTimerRef.current = null;
      retry();
    }, 5_000);
  };

  const handlePermissionsUpdated = useEffectEvent(
    (payload: PermissionsUpdatedPayload) => {
      if (!payload.accessPolicy) {
        requestIdRef.current += 1;
        presenceUpdateControllerRef.current.pendingUpdates.clear();
        setPresenceResource(createEmptyPresenceResource(scopeKey));
        schedulePolicyRefresh();

        return;
      }

      const policy = payload.accessPolicy.organizations.find(
        (organization) => organization.organizationId === selectedGuildId,
      );

      const changes =
        payload.changes?.filter(
          (change) =>
            change.organizationId === selectedGuildId &&
            change.areas.includes("presence"),
        ) ?? [];

      if (policy && changes.length === 0) return;

      if (!policy || changes.some((change) => change.restricted)) {
        requestIdRef.current += 1;
        presenceUpdateControllerRef.current.pendingUpdates.clear();
        setPresenceResource((current) => ({
          ...current,
          accessState: canReadPresence(policy) ? "allowed" : "forbidden",
          loaded: true,
          loading: false,
          onlinePlayers: filterPresenceByPolicy(current.onlinePlayers, policy),
        }));
      }

      if (policyRefreshTimerRef.current !== null) {
        clearTimeout(policyRefreshTimerRef.current);
        policyRefreshTimerRef.current = null;
      }

      if (joined && connected && changes.some((change) => change.expanded)) {
        schedulePolicyRefresh();
      }
    },
  );

  useEffect(() => {
    if (!socket) return;

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

      if (policyRefreshTimerRef.current !== null) {
        clearTimeout(policyRefreshTimerRef.current);
        policyRefreshTimerRef.current = null;
      }
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
    retry,
    setOnlinePlayers,
    stale:
      hasScope && visiblePresenceResource.loaded && (!connected || !joined),
  };
};
