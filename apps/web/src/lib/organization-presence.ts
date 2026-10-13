import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import { GatewayEvent } from "@/config/gateway";
import type { GatewayClient, PlayerPresence } from "@/lib/gateway-client";
import {
  applyGamePresenceUpdate,
  mapMemberGamePresenceByDiscordId,
  type GamePresenceUpdatePayload,
} from "@/lib/game-presence";
import {
  applyMemberWebPresenceUpdate,
  mapMemberWebPresenceByDiscordId,
  type MemberWebPresenceByDiscordId,
  type MemberWebPresenceUpdatePayload,
} from "@/lib/web-presence";

type AvailablePresence = {
  status: "ready" | "stale";
  game: Map<string, PlayerPresence[]>;
  web: MemberWebPresenceByDiscordId;
  accessState: "allowed";
};

type PresenceSnapshot =
  | AvailablePresence
  | {
      status: "loading" | "unavailable";
      game: undefined;
      web: undefined;
      accessState: "allowed";
    }
  | {
      status: "forbidden";
      game: undefined;
      web: undefined;
      accessState: "forbidden";
    };

type PresenceUpdate =
  | {
      platform: "game";
      payload: GamePresenceUpdatePayload;
    }
  | {
      platform: "web";
      payload: MemberWebPresenceUpdatePayload;
    };

const applyPresenceUpdate = (
  snapshot: AvailablePresence,
  update: PresenceUpdate,
): AvailablePresence =>
  update.platform === "game"
    ? {
        ...snapshot,
        game: applyGamePresenceUpdate(snapshot.game, update.payload),
      }
    : {
        ...snapshot,
        web: applyMemberWebPresenceUpdate(snapshot.web, update.payload),
      };

const emptySnapshot = {
  status: "loading",
  game: undefined,
  web: undefined,
  accessState: "allowed",
} satisfies PresenceSnapshot;

const stores = new WeakMap<GatewayClient, Map<string, OrganizationPresence>>();

export class OrganizationPresence {
  private snapshot: PresenceSnapshot = emptySnapshot;
  private readonly listeners = new Set<() => void>();
  private requestId = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private subscribed = false;
  private pendingUpdates: PresenceUpdate[] | undefined;

  private constructor(
    private readonly socket: GatewayClient,
    private readonly guildId: string,
  ) {}

  static for(socket: GatewayClient, guildId: string): OrganizationPresence {
    let organizations = stores.get(socket);

    if (!organizations) {
      organizations = new Map();
      stores.set(socket, organizations);
    }

    let presence = organizations.get(guildId);

    if (!presence) {
      presence = new OrganizationPresence(socket, guildId);
      organizations.set(guildId, presence);
    }

    return presence;
  }

  getSnapshot = (): PresenceSnapshot => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    if (!this.subscribed) {
      this.subscribed = true;
      this.socket.on(GatewayEvent.EVENT_PRESENCE_UPDATE, this.handleGameUpdate);
      this.socket.on(
        GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE,
        this.handleWebUpdate,
      );
      this.socket.on(GatewayEvent.PERMISSIONS_UPDATED, this.handlePermissions);
      this.socket.on(GatewayEvent.JOIN, this.handleJoin);
      this.socket.on(GatewayEvent.DISCONNECT, this.handleDisconnect);
      this.refetch();
    }

    return () => {
      this.listeners.delete(listener);

      // React can replace subscribers during the same commit or rehearse effects.
      queueMicrotask(() => {
        if (this.listeners.size > 0) return;
        this.subscribed = false;
        this.requestId += 1;
        this.cancelRetry();
        this.snapshot = emptySnapshot;
        this.pendingUpdates = undefined;
        this.socket.off(
          GatewayEvent.EVENT_PRESENCE_UPDATE,
          this.handleGameUpdate,
        );
        this.socket.off(
          GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE,
          this.handleWebUpdate,
        );
        this.socket.off(
          GatewayEvent.PERMISSIONS_UPDATED,
          this.handlePermissions,
        );
        this.socket.off(GatewayEvent.JOIN, this.handleJoin);
        this.socket.off(GatewayEvent.DISCONNECT, this.handleDisconnect);
      });
    };
  };

  refetch = () => {
    if (this.listeners.size === 0) return;
    this.cancelRetry();
    const requestId = ++this.requestId;
    this.pendingUpdates = [];

    void this.socket.fetchPresence(this.guildId).then((response) => {
      if (requestId !== this.requestId) return;

      if (response.status === "unavailable") {
        this.pendingUpdates = undefined;
        this.markUnavailable();
        this.retryTimer = setTimeout(this.refetch, 5_000);

        return;
      }

      let snapshot: PresenceSnapshot =
        response.status === "success"
          ? {
              game: mapMemberGamePresenceByDiscordId(response.players),
              web: mapMemberWebPresenceByDiscordId(response.sessions),
              accessState: "allowed",
              status: "ready",
            }
          : { ...emptySnapshot, accessState: "forbidden", status: "forbidden" };

      if (snapshot.status === "ready") {
        // Snapshot rows and their revision are read separately on the gateway.
        // Replay live changes observed during this fetch, including equal revisions.
        for (const update of this.pendingUpdates ?? []) {
          snapshot = applyPresenceUpdate(snapshot, update);
        }
      }

      this.pendingUpdates = undefined;
      this.update(snapshot);
    });
  };

  private update(snapshot: PresenceSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  private cancelRetry() {
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  private markUnavailable() {
    if (this.snapshot.accessState === "forbidden") return;

    if (this.snapshot.status === "ready" || this.snapshot.status === "stale") {
      this.update({ ...this.snapshot, status: "stale" });
    } else {
      this.update({ ...emptySnapshot, status: "unavailable" });
    }
  }

  private handleDisconnect = () => {
    this.requestId += 1;
    this.pendingUpdates = undefined;
    this.cancelRetry();
    this.markUnavailable();
  };

  private handlePermissions = (payload: {
    accessPolicyChanges?: readonly AccessPolicyChange[];
  }) => {
    const changes = payload.accessPolicyChanges;

    if (
      changes === undefined ||
      changes.some(
        (change) =>
          change.organizationId === this.guildId &&
          change.restricted &&
          change.areas.includes("presence"),
      )
    ) {
      // A restriction can hide locations without denying the whole presence list.
      // Drop the old projection before fetching under the new policy.
      this.update({ ...emptySnapshot, status: "unavailable" });
    }

    this.refetch();
  };

  private handleJoin = (payload: {
    status: "success" | "error";
    accessPolicyChanges?: readonly AccessPolicyChange[];
  }) => {
    if (payload.status === "success") this.handlePermissions(payload);
  };

  private handleGameUpdate = (payload: GamePresenceUpdatePayload) =>
    this.handleUpdate({ platform: "game", payload });

  private handleWebUpdate = (payload: MemberWebPresenceUpdatePayload) =>
    this.handleUpdate({ platform: "web", payload });

  private handleUpdate(update: PresenceUpdate) {
    if (update.payload.guildId !== this.guildId) return;
    this.pendingUpdates?.push(update);

    if (this.snapshot.status !== "ready" && this.snapshot.status !== "stale")
      return;
    this.update(applyPresenceUpdate(this.snapshot, update));
  }
}

const disconnectedSnapshot: PresenceSnapshot = {
  ...emptySnapshot,
  status: "unavailable",
};

export const unavailablePresence = {
  getSnapshot: () => disconnectedSnapshot,
  subscribe: () => () => {},
  refetch: () => {},
};
