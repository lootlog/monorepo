import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { GatewayEvent } from "@/config/gateway";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { mapPingController } from "@/features/map-pings/map-ping-controller";
import { mapPingInteractionController } from "@/features/map-pings/map-ping-interaction-controller";
import { airTagRuntime } from "@/features/air-tags/air-tag-runtime";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useDialogStore } from "@/store/game-store/dialog.store";

export class MapChangeProcessor {
  private previousMapId: number | null = null;

  handle(event: GameEvent): void {
    if (!event.town) return;

    const mapId = event.town.id;
    const mapName = event.town.name;
    const previousMapId = this.previousMapId;

    if (previousMapId === mapId) return;

    this.previousMapId = mapId;
    if (previousMapId !== null) {
      useNpcDetectorStore.getState().clearNpcs();
    }
    useDialogStore.getState().clearNpcContext();
    mapPingInteractionController.cancel();
    mapPingController.clear();

    const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

    if (connected && joinedGuilds.length > 0) {
      const socket = getSocket();
      socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
        mapId,
        mapName,
      });
    }

    airTagRuntime.handleMapChange(mapId, mapName);
  }
}
