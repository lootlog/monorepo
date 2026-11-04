import type { AirTagSubscriptionAck } from "@lootlog/protocol/realtime";
import type { AccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { useGameStore } from "@/store/game.store";
import { canReadPresence } from "@/lib/online-players-presence";
import { getSocket, type AccessUpdate } from "@/lib/socket";
import type {
  AirTagObservationBatch,
  AirTagScopeUpdateEvent,
  AirTagSubscriptionPayload,
} from "@lootlog/schema/air-tag";
import {
  AIR_TAG_BATCH_INTERVAL_MS,
  airTagObservationController,
} from "./air-tag-observation-controller";
import { airTagReceiveController } from "./air-tag-receive-controller";

interface AirTagRuntimeState {
  enabled: boolean;
  connected: boolean;
  joined: boolean;
}

/** The Organizations whose presence, and so AirTags, the User may read. */
const readableOrganizations = ({
  organizations,
}: AccessPolicySnapshot): Set<string> =>
  new Set(
    organizations.flatMap((organization) =>
      canReadPresence(organization) ? [organization.organizationId] : [],
    ),
  );

export class AirTagRuntime {
  private state: AirTagRuntimeState = {
    enabled: false,
    connected: false,
    joined: false,
  };
  private allowedOrganizations: ReadonlySet<string> | undefined;
  private readonly pendingOrganizations = new Set<string>();
  private policyRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** AirTags run for everyone on the new interface; the socket decides when they publish. */
  configure(nextState: Omit<AirTagRuntimeState, "enabled">): void {
    const previousState = this.state;
    const wasPublishing = this.isPublishing(previousState);
    const nextEnabled = useGameStore.getState().game?.interface === "ni";

    this.state = { ...nextState, enabled: nextEnabled };
    const isPublishing = this.isPublishing(this.state);

    if (wasPublishing && !nextEnabled) {
      this.emitSubscription({
        requestId: crypto.randomUUID(),
        enabled: false,
      });
    }

    airTagObservationController.configure({
      enabled: nextEnabled,
      canPublish: isPublishing,
      mapId: this.getCurrentMapId(),
      publisher: this.publishObservations,
      onLeftMap: (targetId) => airTagReceiveController.hideDeparted(targetId),
    });

    if (!nextEnabled) {
      airTagReceiveController.clear();

      return;
    }

    if (!isPublishing) {
      this.cancelPolicyRefresh();

      return;
    }

    if (!wasPublishing || !previousState.enabled) {
      const policy = getSocket().getAccessPolicy?.();

      if (policy) {
        this.allowedOrganizations = readableOrganizations(policy);
        airTagReceiveController.retainOrganizations(this.allowedOrganizations);
      }

      this.subscribeCurrentMap(undefined, previousState.enabled);
    }
  }

  handleMapChange(mapId: number): void {
    airTagObservationController.resetForMap(mapId);
    airTagReceiveController.clear();

    if (this.isPublishing(this.state)) {
      this.subscribeCurrentMap(mapId);
    }
  }

  handlePermissionsUpdated(payload: AccessUpdate): void {
    const allowed = readableOrganizations(payload.accessPolicy);

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
        : payload.changes.some(
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
      this.cancelPolicyRefresh();

      return;
    }

    if (this.isPublishing(this.state) && addedOrganization) {
      this.schedulePolicySubscription();
    }
  }

  handleScopeUpdate(event: AirTagScopeUpdateEvent): void {
    airTagReceiveController.handleScopeUpdate(event);
  }

  shutdown(): void {
    this.cancelPolicyRefresh();
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
    airTagObservationController.clear();
    airTagReceiveController.clear();
  }

  /**
   * This character's own publication opened a pending Lootlog, so it needs
   * no role-change debounce: subscribe right away. Other publications, such
   * as AFK or map changes, leave the debounce alone.
   */
  handlePresencePublished(organizationIds: readonly string[]): void {
    if (
      this.policyRefreshTimer === null ||
      !organizationIds.some((id) => this.pendingOrganizations.has(id))
    )
      return;
    this.subscribeCurrentMap(undefined, true);
  }

  private cancelPolicyRefresh(): void {
    if (this.policyRefreshTimer !== null) clearTimeout(this.policyRefreshTimer);
    this.policyRefreshTimer = null;
  }

  private schedulePolicySubscription(): void {
    this.cancelPolicyRefresh();
    this.policyRefreshTimer = setTimeout(() => {
      this.policyRefreshTimer = null;
      this.subscribeCurrentMap(undefined, true);
    }, 5_000);
  }

  private subscribeCurrentMap(
    mapIdOverride?: number,
    preserveScopes = false,
  ): void {
    const mapId = mapIdOverride ?? this.getCurrentMapId();

    if (mapId === null || !this.isPublishing(this.state)) return;

    this.cancelPolicyRefresh();
    this.pendingOrganizations.clear();

    const requestId = crypto.randomUUID();
    airTagReceiveController.beginSubscription(
      requestId,
      useGameStore.getState().game?.world ?? "unknown",
      mapId,
      preserveScopes,
    );
    this.emitSubscription(
      {
        requestId,
        enabled: true,
        expectedMapId: mapId,
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
    // A lost acknowledgement is resent by the next subscription change.
    void getSocket()
      .request("air-tag.subscription", payload)
      .then(acknowledgement, () => undefined);
  }

  private readonly publishObservations = (
    observed: AirTagObservationBatch,
  ): void => {
    if (!this.isPublishing(this.state)) return;
    const socket = getSocket();

    const batch = observed;

    if (batch.observations.length === 0 && !batch.departures?.length) return;

    void socket.request("air-tag.observation", batch).then(
      (acknowledgement) => {
        if (
          acknowledgement.status === "rejected" &&
          acknowledgement.code === "rate-limited"
        )
          airTagObservationController.retry(
            batch,
            acknowledgement.retryAfterMs ?? AIR_TAG_BATCH_INTERVAL_MS,
          );
      },
      () => undefined,
    );
  };

  private getCurrentMapId(): number | null {
    const mapId = useGameStore.getState().game?.map.id;

    return mapId !== undefined && Number.isInteger(mapId) ? mapId : null;
  }

  private isPublishing(state: AirTagRuntimeState): boolean {
    return state.enabled && state.connected && state.joined;
  }
}

export const airTagRuntime = new AirTagRuntime();
