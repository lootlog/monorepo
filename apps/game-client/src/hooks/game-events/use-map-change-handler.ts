import { useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const useMapChangeHandler = () => {
  const previousMapId = useRef<number | null>(null);

  const handleMapChange = (event: GameEvent) => {
    if (!event.town) return;

    // Read current socket state from store (not frozen hook values)
    const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

    if (!connected) return;
    if (joinedGuilds.length === 0) return;

    const mapId = event.town.id;
    const mapName = event.town.name;

    if (previousMapId.current === mapId) return;

    previousMapId.current = mapId;

    const socket = getSocket();
    socket.emit(GatewayEvent.EVENT_PRESENCE_UPDATE as any, {
      mapId,
      mapName,
    });
  };

  return { handleMapChange };
};
