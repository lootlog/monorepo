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

type PresenceSnapshot = {
  game: Map<string, PlayerPresence[]> | undefined;
  web: MemberWebPresenceByDiscordId | undefined;
  accessState: "allowed" | "forbidden";
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
  snapshot: PresenceSnapshot,
  update: PresenceUpdate,
): PresenceSnapshot =>
  update.platform === "game"
    ? {
        ...snapshot,
        game: applyGamePresenceUpdate(snapshot.game, update.payload),
      }
    : {
        ...snapshot,
        web: applyMemberWebPresenceUpdate(snapshot.web, update.payload),
      };

const emptySnapshot: PresenceSnapshot = {
  game: undefined,
  web: undefined,
  accessState: "allowed",
};

const stores = new WeakMap<GatewayClient, Map<string, OrganizationPresence>>();

export class OrganizationPresence {
  private snapshot = emptySnapshot;
  private readonly listeners = new Set<() => void>();
  private requestId = 0;
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
      this.socket.on(GatewayEvent.PERMISSIONS_UPDATED, this.refetch);
      this.socket.on(GatewayEvent.JOIN, this.handleJoin);
      this.refetch();
    }

    return () => {
      this.listeners.delete(listener);

      // React can replace subscribers during the same commit or rehearse effects.
      queueMicrotask(() => {
        if (this.listeners.size > 0) return;
        this.subscribed = false;
        this.requestId += 1;
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
        this.socket.off(GatewayEvent.PERMISSIONS_UPDATED, this.refetch);
        this.socket.off(GatewayEvent.JOIN, this.handleJoin);
      });
    };
  };

  refetch = () => {
    if (this.listeners.size === 0) return;
    const requestId = ++this.requestId;
    this.pendingUpdates = [];

    void this.socket.fetchPresence(this.guildId).then((response) => {
      if (requestId !== this.requestId) return;

      let snapshot: PresenceSnapshot =
        response.status === "success"
          ? {
              game: mapMemberGamePresenceByDiscordId(response.players),
              web: mapMemberWebPresenceByDiscordId(response.sessions),
              accessState: "allowed",
            }
          : { ...emptySnapshot, accessState: "forbidden" };

      if (response.status === "success") {
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

  private handleJoin = (payload: { status: "success" | "error" }) => {
    if (payload.status === "success") this.refetch();
  };

  private handleGameUpdate = (payload: GamePresenceUpdatePayload) =>
    this.handleUpdate({ platform: "game", payload });

  private handleWebUpdate = (payload: MemberWebPresenceUpdatePayload) =>
    this.handleUpdate({ platform: "web", payload });

  private handleUpdate(update: PresenceUpdate) {
    if (update.payload.guildId !== this.guildId) return;
    this.pendingUpdates?.push(update);

    if (this.snapshot.accessState === "forbidden") return;
    this.update(applyPresenceUpdate(this.snapshot, update));
  }
}

export const unavailablePresence = {
  getSnapshot: () => emptySnapshot,
  subscribe: () => () => {},
  refetch: () => {},
};
