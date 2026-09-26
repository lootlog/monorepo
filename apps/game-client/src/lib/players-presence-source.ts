import { isFunction } from "es-toolkit";
import { GatewayEvent } from "@/config/gateway";
import {
  applyPresenceUpdates,
  canReadPresence,
  canReadPresenceLocation,
  filterPresenceByPolicy,
  getPresenceKey,
  normalizePresence,
  normalizePresenceResponse,
  requestServerPresence,
  type PlayerPresence,
  type PlayerPresenceResponse,
  type PlayerPresenceUpdatePayload,
} from "./online-players-presence";
import { PresenceMapIndex } from "./presence-map-index";
import type { AppSocket, PermissionsUpdatedPayload } from "./socket";

type Listener = () => void;

export type PlayersPresenceSnapshot = {
  accessState: "allowed" | "forbidden";
  error: unknown;
  hasLoaded: boolean;
  refreshing: boolean;
  isCurrent: boolean;
  onlinePlayers: PlayerPresenceResponse;
};

export const emptyPlayersPresenceSnapshot: PlayersPresenceSnapshot = {
  accessState: "allowed",
  error: null,
  hasLoaded: false,
  refreshing: false,
  isCurrent: false,
  onlinePlayers: {},
};

const sources = new WeakMap<AppSocket, Map<string, PlayersPresenceSource>>();

export function getPlayersPresenceSource(
  socket: AppSocket,
  guildId: string,
  world: string,
): PlayersPresenceSource {
  let scopes = sources.get(socket);

  if (!scopes) {
    scopes = new Map();
    sources.set(socket, scopes);
  }

  const key = JSON.stringify([guildId, world]);
  let source = scopes.get(key);

  if (!source) {
    source = new PlayersPresenceSource(socket, guildId, world);
    scopes.set(key, source);
  }

  return source;
}

function queueUpdate(
  updates: Map<string, PlayerPresence>,
  presence: PlayerPresence,
): void {
  const identity =
    presence.status === "offline" && presence.sessionId
      ? `session:${presence.sessionId}`
      : getPresenceKey(presence);

  const key = `${presence.discordId}:${identity}`;
  updates.delete(key);
  updates.set(key, presence);
}

/** One live scope serves row consumers and the much narrower occupied-map projection. */
export class PlayersPresenceSource {
  private snapshot = emptyPlayersPresenceSnapshot;
  private readonly index = new PresenceMapIndex();
  private readonly listeners = new Set<Listener>();
  private readonly changeListeners = new Set<
    (presence?: PlayerPresence) => void
  >();
  private readonly mapListeners = new Map<string, Set<Listener>>();
  private readonly pendingRows = new Map<string, PlayerPresence>();
  private readonly pendingMaps = new Set<string>();
  private snapshotUpdates: Map<string, PlayerPresence> | null = null;
  private frame: number | null = null;
  private policyTimer: ReturnType<typeof setTimeout> | null = null;
  private references = 0;
  private active = false;
  private requestId = 0;
  private inFlight: Promise<PlayersPresenceSnapshot> | null = null;
  private snapshotConnectionId: string | undefined;
  private rowsDirty = false;
  loadedAt: number | null = null;

  constructor(
    private readonly socket: AppSocket,
    readonly guildId: string,
    readonly world: string,
  ) {}

  private organization() {
    return this.socket
      .getAccessPolicy()
      ?.organizations.find(
        (organization) => organization.organizationId === this.guildId,
      );
  }

  private ready(): boolean {
    return Boolean(this.socket.id) && this.socket.connectionState === "ready";
  }

  getSnapshot = (): PlayersPresenceSnapshot => {
    if (this.rowsDirty) {
      this.rowsDirty = false;
      this.snapshot = {
        ...this.snapshot,
        onlinePlayers: this.index.toPlayers(),
      };
    }

    return this.snapshot;
  };

  getCurrentSnapshot = (): PlayersPresenceSnapshot => ({
    ...this.snapshot,
    onlinePlayers: this.index.toPlayers(),
  });

  isMapOccupied = (mapName: string): boolean =>
    this.snapshot.isCurrent &&
    this.ready() &&
    this.snapshotConnectionId === this.socket.id &&
    canReadPresenceLocation(this.organization()) &&
    this.index.has(mapName);

  retain = (hydrate = true): (() => void) => {
    this.references += 1;

    if (!this.active) this.start(hydrate);
    else if (hydrate && !this.snapshot.hasLoaded) void this.refresh();
    let retained = true;

    return () => {
      if (!retained) return;
      retained = false;
      this.references -= 1;
      // React may replace a subscription during the same commit.
      queueMicrotask(() => {
        if (this.references === 0) this.stop();
      });
    };
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    const release = this.retain();

    return () => {
      this.listeners.delete(listener);
      release();
    };
  };

  subscribeChanges = (
    listener: (presence?: PlayerPresence) => void,
    hydrate = true,
  ): (() => void) => {
    this.changeListeners.add(listener);
    const release = this.retain(hydrate);

    return () => {
      this.changeListeners.delete(listener);
      release();
    };
  };

  subscribeMap = (mapName: string, listener: Listener): (() => void) => {
    let listeners = this.mapListeners.get(mapName);

    if (!listeners) {
      listeners = new Set();
      this.mapListeners.set(mapName, listeners);
    }

    // Occupancy changes only; metadata deltas must never wake a timer tile.
    let previous = this.isMapOccupied(mapName);

    const onChange = () => {
      const next = this.isMapOccupied(mapName);

      if (next === previous) return;
      previous = next;
      listener();
    };

    listeners.add(onChange);

    return () => {
      listeners.delete(onChange);

      if (listeners.size === 0) this.mapListeners.delete(mapName);
    };
  };

  setPlayers(
    update:
      | PlayerPresenceResponse
      | ((players: PlayerPresenceResponse) => PlayerPresenceResponse),
  ): void {
    const current = this.getSnapshot().onlinePlayers;
    const players = isFunction(update) ? update(current) : update;
    this.index.replace(players);
    this.snapshot = { ...this.snapshot, onlinePlayers: players };
    this.rowsDirty = false;
    this.notify(true);
  }

  refresh = (): Promise<PlayersPresenceSnapshot> => {
    if (this.policyTimer !== null) clearTimeout(this.policyTimer);
    this.policyTimer = null;

    if (this.inFlight) return this.inFlight;

    if (!this.ready()) return Promise.resolve(this.getSnapshot());
    const policy = this.socket.getAccessPolicy();

    if (policy && !canReadPresence(this.organization())) {
      this.restrict();

      return Promise.resolve(this.getSnapshot());
    }

    const requestId = ++this.requestId;
    const connectionId = this.socket.id;
    this.snapshotConnectionId = undefined;
    this.snapshotUpdates = new Map();
    this.snapshot = {
      ...this.snapshot,
      error: null,
      refreshing: true,
      isCurrent: false,
    };
    this.notify(true);

    const request = requestServerPresence(this.socket, this.guildId, this.world)
      .then((response) => {
        if (
          requestId !== this.requestId ||
          connectionId !== this.socket.id ||
          !this.ready()
        )
          return this.getSnapshot();

        if (!response) throw new Error("Online players response was empty");

        if (response.status === "forbidden") {
          this.restrict(true);

          return this.getSnapshot();
        }

        let players = normalizePresenceResponse(response.players);
        players = applyPresenceUpdates(players, [
          ...(this.snapshotUpdates?.values() ?? []),
        ]);
        const currentPolicy = this.socket.getAccessPolicy();

        if (currentPolicy)
          players = filterPresenceByPolicy(players, this.organization());
        this.index.replace(players);
        this.rowsDirty = false;
        this.pendingRows.clear();
        this.snapshotConnectionId = connectionId;
        this.loadedAt = Date.now();
        this.snapshot = {
          accessState:
            currentPolicy && !canReadPresence(this.organization())
              ? "forbidden"
              : "allowed",
          error: null,
          hasLoaded: true,
          refreshing: false,
          isCurrent: true,
          onlinePlayers: players,
        };
        this.notify(true);

        return this.getSnapshot();
      })
      // oxlint-disable-next-line anti-slop/no-unknown-parameters -- Promise rejections are untyped I/O failures, retained for the existing retry UI.
      .catch((error: unknown) => {
        if (requestId === this.requestId) {
          this.snapshot = {
            ...this.snapshot,
            error,
            refreshing: false,
            isCurrent: false,
          };
          this.notify(true);
        }

        return this.getSnapshot();
      })
      .finally(() => {
        if (this.inFlight === request) this.inFlight = null;

        if (requestId === this.requestId) this.snapshotUpdates = null;
      });

    this.inFlight = request;

    return request;
  };

  private start(hydrate: boolean): void {
    this.active = true;
    this.socket.on(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      this.handlePresence,
    );
    this.socket.on(GatewayEvent.PERMISSIONS_UPDATED, this.handlePermissions);
    this.socket.on(GatewayEvent.JOIN, this.handleJoin);
    this.socket.on(GatewayEvent.DISCONNECT, this.handleDisconnect);

    if (hydrate) void this.refresh();
  }

  private stop(): void {
    if (!this.active) return;
    this.active = false;
    this.socket.off(
      GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
      this.handlePresence,
    );
    this.socket.off(GatewayEvent.PERMISSIONS_UPDATED, this.handlePermissions);
    this.socket.off(GatewayEvent.JOIN, this.handleJoin);
    this.socket.off(GatewayEvent.DISCONNECT, this.handleDisconnect);
    this.invalidate();

    if (this.policyTimer !== null) clearTimeout(this.policyTimer);
    this.policyTimer = null;
    this.index.replace({});
    this.rowsDirty = false;
    this.loadedAt = null;
    this.snapshot = emptyPlayersPresenceSnapshot;
  }

  private invalidate(): void {
    this.requestId += 1;
    this.inFlight = null;
    this.snapshotUpdates = null;
    this.snapshotConnectionId = undefined;
    this.pendingRows.clear();
    this.pendingMaps.clear();

    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private handleJoin = (payload: { status: string }): void => {
    if (payload.status === "success") void this.refresh();
  };

  private handleDisconnect = (): void => {
    this.invalidate();
    this.snapshot = { ...this.snapshot, refreshing: false, isCurrent: false };
    this.notify(true);
  };

  private handlePresence = (payload: PlayerPresenceUpdatePayload): void => {
    if (payload.guildId !== this.guildId || !this.ready()) return;
    const presence = normalizePresence(payload);

    if (
      presence.player?.world !== this.world &&
      !(presence.status === "offline" && presence.sessionId && !presence.player)
    )
      return;
    const policy = this.socket.getAccessPolicy();

    if (policy && !canReadPresence(this.organization())) return;

    const allowed = policy
      ? filterPresenceByPolicy(
          { [presence.discordId]: [presence] },
          this.organization(),
        )[presence.discordId]?.[0]
      : presence;

    if (!allowed) return;

    if (this.snapshotUpdates) queueUpdate(this.snapshotUpdates, allowed);

    for (const mapName of this.index.apply(allowed))
      this.pendingMaps.add(mapName);

    if (this.listeners.size > 0) queueUpdate(this.pendingRows, allowed);
    else this.rowsDirty = true;

    for (const listener of this.changeListeners) listener(allowed);

    if (
      this.frame !== null ||
      (this.pendingRows.size === 0 && this.pendingMaps.size === 0)
    )
      return;
    this.frame = window.requestAnimationFrame(this.flush);
  };

  private flush = (): void => {
    this.frame = null;

    if (this.pendingRows.size > 0) {
      const players = this.rowsDirty
        ? this.index.toPlayers()
        : applyPresenceUpdates(this.snapshot.onlinePlayers, [
            ...this.pendingRows.values(),
          ]);

      this.rowsDirty = false;
      this.snapshot = { ...this.snapshot, onlinePlayers: players };
      this.pendingRows.clear();

      for (const listener of this.listeners) listener();
    }

    for (const mapName of this.pendingMaps) {
      for (const listener of this.mapListeners.get(mapName) ?? []) listener();
    }

    this.pendingMaps.clear();
  };

  private restrict(forbidden = !canReadPresence(this.organization())): void {
    const connectionId = this.snapshotConnectionId;

    const isCurrent =
      !forbidden &&
      this.snapshot.isCurrent &&
      this.ready() &&
      connectionId === this.socket.id;

    this.invalidate();

    if (isCurrent) this.snapshotConnectionId = connectionId;

    const players = forbidden
      ? {}
      : filterPresenceByPolicy(this.index.toPlayers(), this.organization());

    this.index.replace(players);
    this.rowsDirty = false;
    this.snapshot = {
      ...this.snapshot,
      accessState: forbidden ? "forbidden" : "allowed",
      hasLoaded: true,
      refreshing: false,
      isCurrent,
      onlinePlayers: players,
    };
    this.notify(true);
  }

  private handlePermissions = (payload: PermissionsUpdatedPayload): void => {
    if (!payload.accessPolicy) {
      this.invalidate();
      this.index.replace({});
      this.rowsDirty = false;
      this.snapshot = emptyPlayersPresenceSnapshot;
      this.notify(true);
      this.scheduleRefresh();

      return;
    }

    const organization = this.organization();

    const changes =
      payload.changes?.filter(
        (change) =>
          change.organizationId === this.guildId &&
          change.areas.includes("presence"),
      ) ?? [];

    if (organization && changes.length === 0) return;

    if (!organization || changes.some((change) => change.restricted))
      this.restrict();

    if (this.policyTimer !== null) clearTimeout(this.policyTimer);
    this.policyTimer = null;

    if (this.ready() && changes.some((change) => change.expanded))
      this.scheduleRefresh();
  };

  private scheduleRefresh(): void {
    if (this.policyTimer !== null) clearTimeout(this.policyTimer);
    this.policyTimer = setTimeout(() => {
      this.policyTimer = null;
      void this.refresh();
    }, 5_000);
  }

  private notify(maps: boolean): void {
    for (const listener of this.changeListeners) listener();

    for (const listener of this.listeners) listener();

    if (maps)
      for (const listeners of this.mapListeners.values()) {
        for (const listener of listeners) listener();
      }
  }
}
