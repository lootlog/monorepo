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
import { useEffect, useRef, useState } from "react";

export type OnlinePlayersAccessState = "allowed" | "forbidden";

export const usePlayersPresence = (
  selectedGuildId?: string,
  world?: string,
): [
  PlayerPresenceResponse,
  boolean,
  React.Dispatch<React.SetStateAction<PlayerPresenceResponse>>,
  OnlinePlayersAccessState,
] => {
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresenceResponse>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [accessState, setAccessState] =
    useState<OnlinePlayersAccessState>("allowed");
  const [permissionsVersion, setPermissionsVersion] = useState(0);
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
      setAccessState("allowed");
      return;
    }

    if (
      !joined ||
      !connected ||
      !socket ||
      !selectedGuildIdRef.current ||
      !world
    )
      return;

    const scopeChanged =
      visibleScopeRef.current.guildId !== selectedGuildId ||
      visibleScopeRef.current.world !== world;
    const currentRequestId = ++requestIdRef.current;
    visibleScopeRef.current = { guildId: selectedGuildId, world };

    if (scopeChanged) {
      setOnlinePlayers({});
    }

    setAccessState("allowed");
    setLoading(true);

    requestServerPresence(socket, selectedGuildIdRef.current, world)
      .then((data) => {
        // ignore stale responses
        if (requestIdRef.current !== currentRequestId) return;

        if (!data) {
          return;
        }

        if (data.status === "forbidden") {
          setOnlinePlayers({});
          setAccessState("forbidden");
          return;
        }

        setOnlinePlayers(normalizePresenceResponse(data.players));
      })
      .finally(() => {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      });
  }, [joined, connected, socket, world, selectedGuildId, permissionsVersion]);

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
      setPermissionsVersion((version) => version + 1);
    };

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, joined, connected]);

  return [onlinePlayers, loading, setOnlinePlayers, accessState];
};
