import { useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { Game } from "@/lib/game";

export const useAfkHandler = () => {
  const previousStasis = useRef<number | null>(null);

  const handleAfkEvent = (event: GameEvent) => {
    if (event.h?.stasis === undefined) return;

    const isAfk = event.h.stasis === 1;

    if (previousStasis.current !== event.h.stasis) {
      previousStasis.current = event.h.stasis;

      // Read current socket state from store (not frozen hook values)
      const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

      if (connected && joinedGuilds.length > 0) {
        const socket = getSocket();
        socket.emit(GatewayEvent.PRESENCE_UPDATE, {
          isAfk,
          mapId: Game.map.id,
          mapName: Game.map.name,
        });
      }
    }
  };

  return { handleAfkEvent };
};
