import { useCallback, useEffect, useRef } from "react";
import { useGlobalStore } from "@/store/global.store";

declare const Game: {
  map: {
    name: string;
  };
};

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

interface UsePresenceTrackerOptions {
  eventId: string;
  guildId: string;
  onPresenceUpdate?: (mapName: string, isAfk: boolean) => void;
}

export const usePresenceTracker = ({
  eventId,
  guildId,
  onPresenceUpdate,
}: UsePresenceTrackerOptions) => {
  const isAfk = useRef(false);
  const currentMapRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);

  const sendPresenceUpdate = useCallback(
    async (mapName: string, afkStatus: boolean) => {
      try {
        // Call the API to update presence
        const response = await fetch(
          `/api/guilds/${guildId}/events/${eventId}/presence`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mapName,
              isAfk: afkStatus,
            }),
          },
        );

        if (response.ok) {
          onPresenceUpdate?.(mapName, afkStatus);
        }
      } catch (error) {
        console.error("Failed to send presence update:", error);
      }
    },
    [eventId, guildId, onPresenceUpdate],
  );

  const handleMapChange = useCallback(
    (newMapName: string) => {
      if (currentMapRef.current !== newMapName) {
        currentMapRef.current = newMapName;
        sendPresenceUpdate(newMapName, isAfk.current);
      }
    },
    [sendPresenceUpdate],
  );

  const handleAfkChange = useCallback(
    (afkStatus: boolean) => {
      if (isAfk.current !== afkStatus) {
        isAfk.current = afkStatus;
        if (currentMapRef.current) {
          sendPresenceUpdate(currentMapRef.current, afkStatus);
        }
      }
    },
    [sendPresenceUpdate],
  );

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setInterval(() => {
      if (currentMapRef.current) {
        sendPresenceUpdate(currentMapRef.current, isAfk.current);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [sendPresenceUpdate]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!gameInitialized) return;

    // Initialize with current map
    if (typeof Game !== "undefined" && Game.map?.name) {
      handleMapChange(Game.map.name);
    }

    startHeartbeat();

    return () => {
      stopHeartbeat();
    };
  }, [gameInitialized, handleMapChange, startHeartbeat, stopHeartbeat]);

  return {
    handleAfkChange,
    handleMapChange,
    isAfk: isAfk.current,
    currentMap: currentMapRef.current,
  };
};
