import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { mapPingController } from "@/features/map-pings/map-ping-controller";
import { mapPingInteractionController } from "@/features/map-pings/map-ping-interaction-controller";

export class MapChangeProcessor {
  private previousMapId: number | null = null;

  handle(event: GameEvent): void {
    if (!event.town) return;

    const mapId = event.town.id;
    const mapName = event.town.name;

    if (this.previousMapId === mapId) return;

    this.previousMapId = mapId;
    mapPingInteractionController.cancel();
    mapPingController.clear();

    const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

    if (!connected) return;
    if (joinedGuilds.length === 0) return;

    const socket = getSocket();
    socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
      mapId,
      mapName,
    });
  }
}
