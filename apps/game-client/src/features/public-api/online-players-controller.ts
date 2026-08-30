import { GatewayEvent } from "@/config/gateway";
import {
  applyPresenceUpdates,
  normalizePresence,
  normalizePresenceResponse,
  requestServerPresence,
  type PlayerPresenceResponse,
  type PlayerPresenceUpdatePayload,
} from "@/lib/online-players-presence";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { mapOnlinePlayers } from "./mappers";
import type {
  PublicOnlinePlayersChangedEvent,
  PublicOnlinePlayersResult,
} from "./types";

type Unsubscribe = () => void;

type OnlinePlayersSocket = Parameters<typeof requestServerPresence>[0] & {
  on(
    event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
    listener: (payload: PlayerPresenceUpdatePayload) => void,
  ): void;
  on(event: GatewayEvent.PERMISSIONS_UPDATED, listener: () => void): void;
  off(
    event: GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
    listener: (payload: PlayerPresenceUpdatePayload) => void,
  ): void;
  off(event: GatewayEvent.PERMISSIONS_UPDATED, listener: () => void): void;
};

type TrackedScope = {
  guildId: string;
  world: string;
  players?: PlayerPresenceResponse;
  resultJson: string;
  requestVersion: number;
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

  private readonly handlePermissionsUpdated = (): void => {
    void this.refreshTrackedScopes();
  };

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

    if (
      response.status !== "forbidden" &&
      scope.requestVersion !== requestVersion
    ) {
      return result;
    }

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

  private async refreshTrackedScopes(): Promise<void> {
    const { connected, joined } = useGlobalStore.getState().socketState;
    if (!this.active || !connected || !joined) return;

    await Promise.allSettled(
      [...this.scopes.values()].map((scope) => this.fetchScope(scope, true)),
    );
  }
}
