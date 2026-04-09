import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@lootlog/margonem/game-events";

export class MapChangeProcessor {
  private previousMapId: number | null = null;

  handle(event: GameEvent): void {
    if (!event.town) return;

    const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

    if (!connected) return;
    if (joinedGuilds.length === 0) return;

    const mapId = event.town.id;
    const mapName = event.town.name;

    if (this.previousMapId === mapId) return;

    this.previousMapId = mapId;

    const socket = getSocket();
    socket.emit(GatewayEvent.PRESENCE_UPDATE, {
      mapId,
      mapName,
    });
  }
}
