import { useEffect, useCallback, useState } from "react";
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
}

interface UseEventPresenceOptions {
  guildId?: string;
  world?: string;
}

export const useEventPresence = ({
  guildId,
  world,
}: UseEventPresenceOptions) => {
  const { socket, connected, joined } = useGateway();
  const [presenceData, setPresenceData] = useState<
    Map<string, PlayerPresence[]>
  >(new Map());

  const handlePresenceUpdate = useCallback(
    (payload: PresenceUpdatePayload) => {
      if (payload.guildId !== guildId) return;

      setPresenceData((prev) => {
        const newMap = new Map(prev);
        const { discordId, sessionId, player, disconnected } = payload;

        if (disconnected && sessionId) {
          const existing = newMap.get(discordId) || [];
          const filtered = existing.filter((p) => p.sessionId !== sessionId);
          if (filtered.length === 0) {
            newMap.delete(discordId);
          } else {
            newMap.set(discordId, filtered);
          }
        } else if (player) {
          if (world && player.world !== world) {
            const existing = newMap.get(discordId) || [];
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

          const existing = newMap.get(discordId) || [];
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
    [guildId, world],
  );

  const fetchInitialPresence = useCallback(() => {
    if (!socket || !connected || !joined || !guildId || !world) return;

    socket.emit(
      GatewayEvent.PRESENCE_FETCH,
      { guildId, world },
      (response: Record<string, PlayerPresence[]>) => {
        const newMap = new Map<string, PlayerPresence[]>();
        for (const [discordId, players] of Object.entries(response)) {
          const filteredPlayers = players.filter((player) => {
            return !world || player.world === world;
          });

          if (filteredPlayers.length > 0) {
            newMap.set(discordId, filteredPlayers);
          }
        }
        setPresenceData(newMap);
      },
    );
  }, [socket, connected, joined, guildId, world]);

  useEffect(() => {
    if (!guildId || !world) {
      setPresenceData(new Map());
    }
  }, [guildId, world]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId || !world) {
      return;
    }

    fetchInitialPresence();

    socket.on(GatewayEvent.PRESENCE_UPDATE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.PRESENCE_UPDATE, handlePresenceUpdate);
    };
  }, [
    socket,
    connected,
    joined,
    guildId,
    world,
    handlePresenceUpdate,
    fetchInitialPresence,
  ]);

  return { presenceData, refetch: fetchInitialPresence };
};
