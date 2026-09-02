import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { getSocket } from "@/lib/socket";
import type {
  AirTagObservationBatch,
  AirTagSubscriptionAck,
  AirTagSubscriptionPayload,
  AirTagUpdateEvent,
} from "@lootlog/schema/air-tag";
import { airTagObservationController } from "./air-tag-observation-controller";
import { airTagReceiveController } from "./air-tag-receive-controller";
import { airTagRenderer } from "./air-tag-renderer";

interface AirTagRuntimeState {
  enabled: boolean;
  connected: boolean;
  joined: boolean;
}

export class AirTagRuntime {
  private state: AirTagRuntimeState = {
    enabled: false,
    connected: false,
    joined: false,
  };
  private currentMapId: number | null = null;
  private currentMapName: string | null = null;

  configure(nextState: AirTagRuntimeState): void {
    const previousState = this.state;
    const wasPublishing = this.isPublishing(previousState);
    const nextEnabled =
      nextState.enabled && useGameStore.getState().game?.interface === "ni";
    this.state = { ...nextState, enabled: nextEnabled };
    const isPublishing = this.isPublishing(this.state);

    if (previousState.enabled && !nextEnabled && wasPublishing) {
      this.emitSubscription({
        requestId: crypto.randomUUID(),
        enabled: false,
      });
    }

    const map = this.getCurrentMap();
    this.currentMapId = map?.id ?? null;
    this.currentMapName = map?.name ?? null;
    airTagObservationController.configure({
      enabled: nextEnabled,
      canPublish: isPublishing,
      mapId: this.currentMapId,
      publisher: this.publishObservations,
    });

    if (!nextEnabled) {
      airTagReceiveController.clear();
      airTagRenderer.unregister();
      return;
    }

    airTagRenderer.register();
    if (!isPublishing) {
      airTagReceiveController.clear();
      return;
    }

    if (!wasPublishing || !previousState.enabled) {
      this.subscribeCurrentMap(true);
    }
  }

  handleMapChange(mapId: number, mapName: string): void {
    this.currentMapId = mapId;
    this.currentMapName = mapName;
    airTagObservationController.resetForMap(mapId);
    airTagReceiveController.clear();

    if (this.isPublishing(this.state)) {
      airTagRenderer.register();
      this.subscribeCurrentMap(false, { id: mapId, name: mapName });
    }
  }

  handlePermissionsUpdated(): void {
    airTagReceiveController.clear();
    if (this.isPublishing(this.state)) {
      this.subscribeCurrentMap(false);
    }
  }

  handleUpdate(event: AirTagUpdateEvent): void {
    airTagReceiveController.handleUpdate(event);
  }

  shutdown(): void {
    if (this.isPublishing(this.state)) {
      this.emitSubscription({
        requestId: crypto.randomUUID(),
        enabled: false,
      });
    }
    this.state = { enabled: false, connected: false, joined: false };
    this.currentMapId = null;
    this.currentMapName = null;
    airTagObservationController.clear();
    airTagReceiveController.clear();
    airTagRenderer.unregister();
  }

  private subscribeCurrentMap(
    updatePresence: boolean,
    mapOverride?: { id: number; name: string },
  ): void {
    const map = mapOverride ?? this.getCurrentMap();
    if (!map || !this.isPublishing(this.state)) return;

    this.currentMapId = map.id;
    this.currentMapName = map.name;
    const socket = getSocket();
    if (updatePresence) {
      socket.emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
        mapId: map.id,
        mapName: map.name,
      });
    }

    const requestId = crypto.randomUUID();
    airTagReceiveController.beginSubscription(
      requestId,
      useGameStore.getState().game?.world ?? "unknown",
      map.id,
    );
    this.emitSubscription(
      {
        requestId,
        enabled: true,
        expectedMapId: map.id,
      },
      (acknowledgement) => {
        airTagReceiveController.applySubscriptionAck(acknowledgement);
      },
    );
  }

  private emitSubscription(
    payload: AirTagSubscriptionPayload,
    acknowledgement: (response: AirTagSubscriptionAck) => void = () => {},
  ): void {
    getSocket().emit(
      GatewayEvent.AIR_TAG_SUBSCRIPTION,
      payload,
      acknowledgement,
    );
  }

  private readonly publishObservations = (
    batch: AirTagObservationBatch,
  ): void => {
    if (!this.isPublishing(this.state)) return;

    getSocket().emit(GatewayEvent.AIR_TAG_OBSERVATION, batch, () => {});
  };

  private getCurrentMap(): { id: number; name: string } | null {
    const map = useGameStore.getState().game?.map;
    if (!Number.isInteger(map?.id) || typeof map?.name !== "string")
      return null;

    return { id: map.id, name: map.name };
  }

  private isPublishing(state: AirTagRuntimeState): boolean {
    return state.enabled && state.connected && state.joined;
  }
}

export const airTagRuntime = new AirTagRuntime();
