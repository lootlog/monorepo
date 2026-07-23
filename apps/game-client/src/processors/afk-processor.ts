import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type { RuntimeIngressSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useGameStore } from "@/store/game.store";

export class AfkProcessor {
  private previousStasis: number | null = null;

  handle(event: GameEvent, ingress?: RuntimeIngressSnapshot): void {
    if (event.h?.stasis === undefined) return;

    const isAfk = event.h.stasis === 1;

    if (this.previousStasis !== event.h.stasis) {
      this.previousStasis = event.h.stasis;

      const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

      if (connected && joinedGuilds.length > 0) {
        const game = ingress?.game ?? useGameStore.getState().game;
        if (!game) return;
        const socket = getSocket();
        socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
          isAfk,
          mapId: game.map.id,
          mapName: game.map.name,
        });
      }
    }
  }
}
