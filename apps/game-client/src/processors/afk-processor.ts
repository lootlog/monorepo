import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { Game } from "@/lib/game";

export class AfkProcessor {
  private previousStasis: number | null = null;

  handle(event: GameEvent): void {
    if (event.h?.stasis === undefined) return;

    const isAfk = event.h.stasis === 1;

    if (this.previousStasis !== event.h.stasis) {
      this.previousStasis = event.h.stasis;

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
  }
}
