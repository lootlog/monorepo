import { GatewayEvent } from "@/config/gateway";
import {
  applyPresenceUpdates,
  canReadPresence,
  filterPresenceByPolicy,
  normalizePresence,
  normalizePresenceResponse,
  requestServerPresence,
  type PlayerPresenceResponse,
  type PlayerPresenceUpdatePayload,
} from "@/lib/online-players-presence";
import type { AccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { getSocket, type PermissionsUpdatedPayload } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { mapOnlinePlayers } from "./mappers";
import type {
  PublicOnlinePlayersChangedEvent,
  PublicOnlinePlayersResult,
} from "./types";

type Unsubscribe = () => void;

type OnlinePlayersSocket = Parameters<typeof requestServerPresence>[0] & {
  getAccessPolicy?: () => AccessPolicySnapshot | undefined;
  on(
    event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
    listener: (payload: PlayerPresenceUpdatePayload) => void,
  ): void;
  on(
    event: GatewayEvent.PERMISSIONS_UPDATED,
    listener: (payload: PermissionsUpdatedPayload) => void,
  ): void;
  off(
    event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
    listener: (payload: PlayerPresenceUpdatePayload) => void,
  ): void;
  off(
    event: GatewayEvent.PERMISSIONS_UPDATED,
    listener: (payload: PermissionsUpdatedPayload) => void,
  ): void;
};

type TrackedScope = {
  guildId: string;
  world: string;
  players?: PlayerPresenceResponse;
  resultJson: string;
  requestVersion: number;
  forbidden?: boolean;
};

type OnlinePlayersControllerDependencies = {
  getSocket: () => OnlinePlayersSocket;
  publish: (event: PublicOnlinePlayersChangedEvent) => void;
};

const getScopeKey = (guildId: string, world: string): string =>
  JSON.stringify([guildId, world]);

const requireNonEmptyString = (value: unknown, name: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }

  return value;
};

const cloneResult = (
  scope: TrackedScope,
  result: PublicOnlinePlayersResult,
): PublicOnlinePlayersResult => {
  if (result.status === "forbidden") {
    return { ...result };
  }

  return {
    status: "success",
    players: mapOnlinePlayers(scope.players ?? {}),
  };
};

export class PublicOnlinePlayersController {
  private readonly getSocket: () => OnlinePlayersSocket;
  private readonly publish: (event: PublicOnlinePlayersChangedEvent) => void;
  private readonly scopes = new Map<string, TrackedScope>();
  private active = false;
  private accessPolicy: AccessPolicySnapshot | undefined;
  private readonly pendingPolicyScopes = new Set<string>();
  private policyRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeSocketState: Unsubscribe | null = null;

  constructor(
    dependencies: Partial<OnlinePlayersControllerDependencies> & {
      publish: OnlinePlayersControllerDependencies["publish"];
    },
  ) {
    this.getSocket = dependencies.getSocket ?? getSocket;
    this.publish = dependencies.publish;
  }

  async getOnlinePlayers(options: {
    guildId: string;
    world: string;
  }): Promise<PublicOnlinePlayersResult> {
    const guildId = requireNonEmptyString(options?.guildId, "guildId");
    const world = requireNonEmptyString(options?.world, "world");
    const { connected, joined } = useGlobalStore.getState().socketState;

    if (!connected || !joined) {
      throw new Error("The gateway socket is not ready");
    }

    const scope = this.getOrCreateScope(guildId, world);
    const result = await this.fetchScope(scope, false);
    return cloneResult(scope, result);
  }

  activate(): void {
    if (this.active) return;

    this.active = true;
    const socket = this.getSocket();
    socket.on(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      this.handlePresenceUpdate,
    );
    socket.on(GatewayEvent.PERMISSIONS_UPDATED, this.handlePermissionsUpdated);
    this.unsubscribeSocketState = useGlobalStore.subscribe(
      (state, previous) => {
        const becameReady =
          state.socketState.connected &&
          state.socketState.joined &&
          (!previous.socketState.connected || !previous.socketState.joined);

        if (becameReady) {
          void this.refreshTrackedScopes();
        }
      },
    );

    void this.refreshTrackedScopes();
  }

  deactivate(): void {
    if (!this.active) return;

    this.active = false;
    if (this.policyRefreshTimer !== null) clearTimeout(this.policyRefreshTimer);
    this.policyRefreshTimer = null;
    this.pendingPolicyScopes.clear();
    const socket = this.getSocket();
    socket.off(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      this.handlePresenceUpdate,
    );
    socket.off(GatewayEvent.PERMISSIONS_UPDATED, this.handlePermissionsUpdated);
    this.unsubscribeSocketState?.();
    this.unsubscribeSocketState = null;
  }

  teardown(): void {
    this.deactivate();
    this.scopes.clear();
  }

  private readonly handlePresenceUpdate = (
    payload: PlayerPresenceUpdatePayload,
  ): void => {
    const presence = normalizePresence(payload);
    const guildId = presence.guildId;
    const world = presence.player?.world;
    if (!guildId || !world) return;

    const scope = this.scopes.get(getScopeKey(guildId, world));
    if (!scope?.players) return;

    const players = applyPresenceUpdates(scope.players, [presence]);
    if (players === scope.players) return;

    scope.requestVersion += 1;
    scope.players = players;
    this.publishScopeIfChanged(scope, {
      status: "success",
      players: mapOnlinePlayers(players),
    });
  };

  private readonly handlePermissionsUpdated = (
    payload: PermissionsUpdatedPayload,
  ): void => {
    if (!payload?.accessPolicy) {
      this.accessPolicy = undefined;
      for (const [key, scope] of this.scopes) {
        this.pendingPolicyScopes.add(key);
        scope.requestVersion += 1;
        scope.players = {};
        this.publishScopeIfChanged(scope, { status: "success", players: {} });
      }
      this.schedulePolicyRefresh();
      return;
    }
    this.accessPolicy = payload.accessPolicy;
    for (const [key, scope] of this.scopes) {
      const policy = payload.accessPolicy.organizations.find(
        (organization) => organization.organizationId === scope.guildId,
      );
      const changes =
        payload.changes?.filter(
          (change) =>
            change.organizationId === scope.guildId &&
            change.areas.includes("presence"),
        ) ?? [];
      if (policy && changes.length === 0) continue;
      if (!policy || changes.some((change) => change.restricted)) {
        scope.requestVersion += 1;
        scope.forbidden = !canReadPresence(policy);
        scope.players = filterPresenceByPolicy(scope.players ?? {}, policy);
        this.publishScopeIfChanged(
          scope,
          scope.forbidden
            ? { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" }
            : { status: "success", players: mapOnlinePlayers(scope.players) },
        );
      }
      if (changes.some((change) => change.expanded))
        this.pendingPolicyScopes.add(key);
      else this.pendingPolicyScopes.delete(key);
    }
    this.schedulePolicyRefresh();
  };

  private schedulePolicyRefresh(): void {
    if (this.policyRefreshTimer !== null) clearTimeout(this.policyRefreshTimer);
    if (this.pendingPolicyScopes.size === 0) {
      this.policyRefreshTimer = null;
      return;
    }
    this.policyRefreshTimer = setTimeout(() => {
      this.policyRefreshTimer = null;
      const keys = new Set(this.pendingPolicyScopes);
      this.pendingPolicyScopes.clear();
      void this.refreshTrackedScopes(keys);
    }, 5_000);
  }

  private getOrCreateScope(guildId: string, world: string): TrackedScope {
    const key = getScopeKey(guildId, world);
    const existing = this.scopes.get(key);
    if (existing) return existing;

    const scope: TrackedScope = {
      guildId,
      world,
      resultJson: "",
      requestVersion: 0,
    };
    this.scopes.set(key, scope);
    return scope;
  }

  private async fetchScope(
    scope: TrackedScope,
    publishChanges: boolean,
  ): Promise<PublicOnlinePlayersResult> {
    this.pendingPolicyScopes.delete(getScopeKey(scope.guildId, scope.world));
    if (
      this.pendingPolicyScopes.size === 0 &&
      this.policyRefreshTimer !== null
    ) {
      clearTimeout(this.policyRefreshTimer);
      this.policyRefreshTimer = null;
    }
    const policy = this.accessPolicy ?? this.getSocket().getAccessPolicy?.();
    if (
      policy &&
      !canReadPresence(
        policy.organizations.find(
          (organization) => organization.organizationId === scope.guildId,
        ),
      )
    ) {
      scope.forbidden = true;
      scope.players = {};
      return { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" };
    }
    const requestVersion = ++scope.requestVersion;
    const response = await requestServerPresence(
      this.getSocket(),
      scope.guildId,
      scope.world,
    );

    if (!response) {
      throw new Error("Online players response was empty");
    }

    const result: PublicOnlinePlayersResult =
      response.status === "forbidden"
        ? { status: "forbidden", code: response.code }
        : {
            status: "success",
            players: mapOnlinePlayers(
              normalizePresenceResponse(response.players),
            ),
          };

    if (scope.requestVersion !== requestVersion) {
      return scope.forbidden
        ? { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" }
        : { status: "success", players: mapOnlinePlayers(scope.players ?? {}) };
    }

    scope.forbidden = response.status === "forbidden";
    scope.players =
      response.status === "success"
        ? normalizePresenceResponse(response.players)
        : undefined;

    if (publishChanges) {
      this.publishScopeIfChanged(scope, result);
    } else {
      scope.resultJson = JSON.stringify(result);
    }

    return result;
  }

  private publishScopeIfChanged(
    scope: TrackedScope,
    result: PublicOnlinePlayersResult,
  ): void {
    const resultJson = JSON.stringify(result);
    if (resultJson === scope.resultJson) return;

    scope.resultJson = resultJson;
    this.publish({ guildId: scope.guildId, world: scope.world, ...result });
  }

  private async refreshTrackedScopes(
    keys?: ReadonlySet<string>,
  ): Promise<void> {
    const { connected, joined } = useGlobalStore.getState().socketState;
    if (!this.active || !connected || !joined) return;

    await Promise.allSettled(
      [...this.scopes.entries()]
        .filter(([key]) => !keys || keys.has(key))
        .map(([, scope]) => this.fetchScope(scope, true)),
    );
  }
}
