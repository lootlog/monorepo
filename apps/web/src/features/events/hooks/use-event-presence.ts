import { useEffect, useCallback, useState } from "react";
import { useGateway } from "@/hooks/utils/use-gateway";
import { GatewayEvent } from "@/config/gateway";

export interface PlayerPresenceData {
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;
  disconnected?: boolean;
}

interface PresenceUpdatePayload extends PlayerPresenceData {
  guildId: string;
  discordId: string;
}

interface UseEventPresenceOptions {
  guildId?: string;
}

export const useEventPresence = ({ guildId }: UseEventPresenceOptions) => {
  const { socket, connected, joined } = useGateway();
  const [presenceData, setPresenceData] = useState<
    Map<string, PlayerPresenceData>
  >(new Map());

  const handlePresenceUpdate = useCallback(
    (payload: PresenceUpdatePayload) => {
      console.log("[EventPresence] Received update:", payload, "guildId:", guildId);
      if (payload.guildId !== guildId) return;

      setPresenceData((prev) => {
        const newMap = new Map(prev);

        if (payload.disconnected) {
          newMap.delete(payload.discordId);
        } else {
          newMap.set(payload.discordId, {
            mapId: payload.mapId,
            mapName: payload.mapName,
            isAfk: payload.isAfk,
            updatedAt: payload.updatedAt,
          });
        }

        console.log("[EventPresence] Updated map:", Object.fromEntries(newMap));
        return newMap;
      });
    },
    [guildId],
  );

  const fetchInitialPresence = useCallback(() => {
    if (!socket || !connected || !joined || !guildId) return;

    console.log("[EventPresence] Fetching initial presence for guildId:", guildId);
    socket.emit(
      "event:presence:fetch",
      { guildId },
      (response: Record<string, PlayerPresenceData>) => {
        console.log("[EventPresence] Fetch response:", response);
        const newMap = new Map<string, PlayerPresenceData>();
        for (const [discordId, data] of Object.entries(response)) {
          newMap.set(discordId, data);
        }
        console.log("[EventPresence] Initial presence map:", Object.fromEntries(newMap));
        setPresenceData(newMap);
      },
    );
  }, [socket, connected, joined, guildId]);

  useEffect(() => {
    if (!socket || !connected || !joined || !guildId) {
      console.log("[EventPresence] Skipping setup - missing:", { socket: !!socket, connected, joined, guildId });
      return;
    }

    console.log("[EventPresence] Setting up listener for guildId:", guildId);
    fetchInitialPresence();

    socket.on(GatewayEvent.EVENT_PRESENCE_UPDATE, handlePresenceUpdate);

    return () => {
      socket.off(GatewayEvent.EVENT_PRESENCE_UPDATE, handlePresenceUpdate);
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
