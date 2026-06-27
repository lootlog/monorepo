import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";

export interface PlayerPresence {
  world: string;
  name: string;
  characterId: string;
  accountId: string;
  icon: string;
  lvl: string;
  prof: string;
  margonemAccountVerified?: boolean;
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;
  sessionId: string;
}

interface PresenceUpdatePayload {
  guildId: string;
  discordId: string;
  sessionId?: string;
  player?: PlayerPresence;
  disconnected?: boolean;
  status?: "online" | "offline";
}

interface UseEventPresenceOptions {
  guildId?: string;
  world?: string;
}

export type EventPresenceAccessState = "allowed" | "forbidden";

type EventPresenceFetchPayload =
  | {
      status: "success";
      players: Record<string, PlayerPresence[]>;
    }
  | {
      status: "forbidden";
      code: "ONLINE_PLAYERS_ACCESS_DENIED";
    };

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

  const requestPresence = useEffectEvent(() => {
    if (!socket || !connected || !joined || !guildId || !world) return;

    const requestId = ++requestIdRef.current;

    socket.emit(
      GatewayEvent.EVENT_PRESENCE_FETCH,
      { guildId, world },
      (response?: EventPresenceFetchPayload) => {
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
    (payload: PresenceUpdatePayload) => {
      if (payload.guildId !== guildId) return;
      if (accessState === "forbidden") return;

      setPresenceData((prev) => {
        const newMap = new Map(prev ?? []);
        const { discordId, sessionId, player, disconnected, status } = payload;

        const disconnectedSessionId = sessionId ?? player?.sessionId;

        if ((disconnected || status === "offline") && disconnectedSessionId) {
          const existing = newMap.get(discordId) ?? [];
          const filtered = existing.filter(
            (presence) => presence.sessionId !== disconnectedSessionId,
          );
          if (filtered.length === 0) {
            newMap.delete(discordId);
          } else {
            newMap.set(discordId, filtered);
          }
        } else if (player) {
          if (world && player.world !== world) {
            const existing = newMap.get(discordId) ?? [];
            const filtered = existing.filter(
              (p) => p.sessionId !== player.sessionId,
            );
            if (filtered.length === 0) {
              newMap.delete(discordId);
            } else {
              newMap.set(discordId, filtered);
            }

            return newMap;
          }

          const existing = newMap.get(discordId) ?? [];
          const idx = existing.findIndex(
            (p) => p.sessionId === player.sessionId,
          );
          if (idx >= 0) {
            const updated = [...existing];
            updated[idx] = player;
            newMap.set(discordId, updated);
          } else {
            newMap.set(discordId, [...existing, player]);
          }
        }

        return newMap;
      });
    },
  );

  const handlePermissionsUpdated = useEffectEvent(() => {
    requestIdRef.current += 1;
    setPresenceData(undefined);
    setAccessState("forbidden");
    setRefreshVersion((version) => version + 1);
  });

  useEffect(() => {
    if (!guildId || !world) {
      requestIdRef.current += 1;
      setPresenceData(undefined);
      setAccessState("allowed");
    }
  }, [guildId, world]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId || !world) {
      return;
    }

    requestPresence();

    socket.on(GatewayEvent.EVENT_PRESENCE_UPDATE, handleEventPresenceUpdate);

    return () => {
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
