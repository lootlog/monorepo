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
}

export const useEventPresence = ({ guildId }: UseEventPresenceOptions) => {
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
          const existing = newMap.get(discordId) || [];
          const idx = existing.findIndex(
            (p) => p.sessionId === player.sessionId,
          );
          if (idx >= 0) {
            existing[idx] = player;
          } else {
            existing.push(player);
          }
          newMap.set(discordId, existing);
        }

        return newMap;
      });
    },
    [guildId],
  );

  const fetchInitialPresence = useCallback(() => {
    if (!socket || !connected || !joined || !guildId) return;

    socket.emit(
      GatewayEvent.PRESENCE_FETCH,
      { guildId },
      (response: Record<string, PlayerPresence[]>) => {
        const newMap = new Map<string, PlayerPresence[]>();
        for (const [discordId, players] of Object.entries(response)) {
          newMap.set(discordId, players);
        }
        setPresenceData(newMap);
      },
    );
  }, [socket, connected, joined, guildId]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId) {
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
    handlePresenceUpdate,
    fetchInitialPresence,
  ]);

  return { presenceData, refetch: fetchInitialPresence };
};
