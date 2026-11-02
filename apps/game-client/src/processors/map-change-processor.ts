import { publishPlayerPresence } from "@/lib/socket";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { mapPingController } from "@/features/pings/map-ping-controller";
import { pingInteractionController } from "@/features/pings/ping-interaction-controller";
import { airTagRuntime } from "@/features/air-tags/air-tag-runtime";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { useGameStore } from "@/store/game.store";
import { useDialogStore } from "@/store/game-store/dialog.store";

export class MapChangeProcessor {
  private previousMapId: number | null = null;

  // Lootlog may start on an already loaded map, so the first town packet can
  // be a real transition away from the map whose NPCs were bootstrapped.
  bootstrap(): void {
    this.previousMapId ??= useGameStore.getState().game?.map.id ?? null;
  }

  handle(event: GameEvent): void {
    if (!event.town) return;

    const projectedMap = useGameStore.getState().game?.map;
    const mapId = event.town.id ?? projectedMap?.id;

    if (mapId === undefined) return;

    const mapName =
      event.town.name?.trim() ||
      (projectedMap?.id === mapId ? projectedMap.name : "");

    if (!mapName) return;
    const previousMapId = this.previousMapId;

    if (previousMapId === mapId) return;

    this.previousMapId = mapId;

    if (previousMapId !== null) {
      useNpcDetectorStore.getState().clearNpcs();
      npcsDetectionProcessor.handleMapChange();
    }

    useDialogStore.getState().clearNpcContext();
    pingInteractionController.cancel();
    mapPingController.clear();

    publishPlayerPresence();

    airTagRuntime.handleMapChange(mapId);
  }
}
