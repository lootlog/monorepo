import type { AirTagSubscriptionAck } from "@lootlog/protocol/realtime";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { canReadPresence } from "@/lib/online-players-presence";
import { getSocket, type PermissionsUpdatedPayload } from "@/lib/socket";
import type {
  AirTagObservationBatch,
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
  private allowedOrganizations: ReadonlySet<string> | undefined;
  private readonly pendingOrganizations = new Set<string>();
  private policyRefreshTimer: ReturnType<typeof setTimeout> | null = null;

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
      if (this.policyRefreshTimer !== null)
        clearTimeout(this.policyRefreshTimer);
      this.policyRefreshTimer = null;

      return;
    }

    if (!wasPublishing || !previousState.enabled) {
      const policy = getSocket().getAccessPolicy?.();

      if (policy) {
        this.allowedOrganizations = new Set(
          policy.organizations.flatMap((organization) =>
            canReadPresence(organization) ? [organization.organizationId] : [],
          ),
        );
        airTagReceiveController.retainOrganizations(this.allowedOrganizations);
      }

      this.subscribeCurrentMap(true, undefined, previousState.enabled);
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

  handlePermissionsUpdated(payload?: PermissionsUpdatedPayload): void {
    if (!payload?.accessPolicy) {
      this.allowedOrganizations = undefined;
      airTagReceiveController.retainOrganizations();
      airTagReceiveController.clear();

      if (this.isPublishing(this.state)) this.schedulePolicySubscription();

      return;
    }

    const allowed = new Set(
      payload.accessPolicy.organizations.flatMap((organization) =>
        canReadPresence(organization) ? [organization.organizationId] : [],
      ),
    );

    const previous = this.allowedOrganizations;
    this.allowedOrganizations = allowed;
    airTagReceiveController.retainOrganizations(allowed);

    for (const organizationId of this.pendingOrganizations) {
      if (!allowed.has(organizationId))
        this.pendingOrganizations.delete(organizationId);
    }

    let addedOrganization = false;

    for (const organizationId of allowed) {
      const expanded = previous
        ? !previous.has(organizationId)
        : payload.changes?.some(
            (change) =>
              change.organizationId === organizationId &&
              change.areas.includes("presence") &&
              change.expanded,
          );

      if (expanded) {
        addedOrganization = true;
        this.pendingOrganizations.add(organizationId);
      }
    }

    if (this.pendingOrganizations.size === 0) {
      if (this.policyRefreshTimer !== null)
        clearTimeout(this.policyRefreshTimer);
      this.policyRefreshTimer = null;

      return;
    }

    if (this.isPublishing(this.state) && addedOrganization) {
      this.schedulePolicySubscription();
    }
  }

  handleUpdate(event: AirTagUpdateEvent): void {
    airTagReceiveController.handleUpdate(event);
  }

  shutdown(): void {
    if (this.policyRefreshTimer !== null) clearTimeout(this.policyRefreshTimer);
    this.policyRefreshTimer = null;
    this.pendingOrganizations.clear();
    this.allowedOrganizations = undefined;
    airTagReceiveController.retainOrganizations();

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

  private schedulePolicySubscription(): void {
    if (this.policyRefreshTimer !== null) clearTimeout(this.policyRefreshTimer);
    this.policyRefreshTimer = setTimeout(() => {
      this.policyRefreshTimer = null;
      this.subscribeCurrentMap(false, undefined, true);
    }, 5_000);
  }

  private subscribeCurrentMap(
    updatePresence: boolean,
    mapOverride?: { id: number; name: string },
    preserveScopes = false,
  ): void {
    const map = mapOverride ?? this.getCurrentMap();

    if (!map || !this.isPublishing(this.state)) return;

    if (this.policyRefreshTimer !== null) clearTimeout(this.policyRefreshTimer);
    this.policyRefreshTimer = null;
    this.pendingOrganizations.clear();

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
      preserveScopes,
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
    acknowledgement: (
      response: typeof AirTagSubscriptionAck.Type,
    ) => void = () => {},
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

    if (!map || !Number.isInteger(map.id)) return null;

    return { id: map.id, name: map.name };
  }

  private isPublishing(state: AirTagRuntimeState): boolean {
    return state.enabled && state.connected && state.joined;
  }
}

export const airTagRuntime = new AirTagRuntime();
