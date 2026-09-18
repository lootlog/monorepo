import {
  applyGamePresenceUpdate,
  type GamePresenceUpdatePayload,
} from "@/lib/game-presence";
import type {
  PlayerPresence,
  PlayerPresenceResponse,
} from "@/lib/gateway-client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";

interface UseEventPresenceOptions {
  guildId?: string;
  world?: string;
}

export type EventPresenceAccessState = "allowed" | "forbidden";

export const useEventPresence = ({
  guildId,
  world,
}: UseEventPresenceOptions) => {
  const { socket, connected, joined } = useGateway();

  const [presenceData, setPresenceData] = useState<
    Map<string, PlayerPresence[]> | undefined
  >(undefined);

  const [accessState, setAccessState] =
    useState<EventPresenceAccessState>("allowed");

  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestIdRef = useRef(0);
  const [scope, setScope] = useState({ guildId, world });

  if (scope.guildId !== guildId || scope.world !== world) {
    setScope({ guildId, world });
    setPresenceData(undefined);
    setAccessState("allowed");
  }

  const requestPresence = useEffectEvent(() => {
    if (!socket || !connected || !joined || !guildId || !world) return;

    const requestId = ++requestIdRef.current;

    socket.emit(
      GatewayEvent.EVENT_PRESENCE_FETCH,
      { guildId, world },
      (response?: PlayerPresenceResponse) => {
        if (requestIdRef.current !== requestId || !response) return;

        if (response.status === "forbidden") {
          setPresenceData(undefined);
          setAccessState("forbidden");

          return;
        }

        const newMap = new Map<string, PlayerPresence[]>();

        for (const [discordId, players] of Object.entries(response.players)) {
          const filteredPlayers = players.filter((player) => {
            return !world || player.world === world;
          });

          if (filteredPlayers.length > 0) {
            newMap.set(discordId, filteredPlayers);
          }
        }

        setPresenceData(newMap);
        setAccessState("allowed");
      },
    );
  });

  const handleEventPresenceUpdate = useEffectEvent(
    (payload: GamePresenceUpdatePayload) => {
      if (payload.guildId !== guildId) return;

      if (accessState === "forbidden") return;

      setPresenceData((previous) => {
        const { player, disconnected, status } = payload;

        const isWorldChange =
          !disconnected &&
          status !== "offline" &&
          player &&
          world &&
          player.world !== world;

        return applyGamePresenceUpdate(
          previous,
          isWorldChange
            ? { ...payload, sessionId: player.sessionId, disconnected: true }
            : payload,
        );
      });
    },
  );

  const handlePermissionsUpdated = useEffectEvent(() => {
    requestIdRef.current += 1;
    setRefreshVersion((version) => version + 1);
  });

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId || !world) {
      return;
    }

    requestPresence();

    socket.on(GatewayEvent.EVENT_PRESENCE_UPDATE, handleEventPresenceUpdate);

    return () => {
      requestIdRef.current += 1;
      socket.off(GatewayEvent.EVENT_PRESENCE_UPDATE, handleEventPresenceUpdate);
    };
  }, [socket, connected, joined, guildId, world, refreshVersion]);

  useEffect(() => {
    if (!socket || !connected || !joined) return;

    socket.on(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);

    return () => {
      socket.off(GatewayEvent.PERMISSIONS_UPDATED, handlePermissionsUpdated);
    };
  }, [socket, connected, joined]);

  return {
    presenceData,
    accessState,
    refetch: () => setRefreshVersion((version) => version + 1),
  };
};
