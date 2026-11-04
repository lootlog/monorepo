import {
  diffAccessPolicies,
  type AccessPolicyChange,
  type AccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import {
  RealtimeEventListeners,
  unwrapOrganizationEvent,
} from "@lootlog/client/realtime/event-listeners";
import { GATEWAY_SOCKET_PATH, GATEWAY_URL } from "@/config/gateway";
import {
  RealtimeClient,
  RealtimeRequestError,
  type BasicPresence,
  type PresenceWithLocation,
  type ServerEvent,
} from "@lootlog/client/realtime";
import type { GamePresenceUpdatePayload } from "@/lib/game-presence";
import type { MemberWebPresenceUpdatePayload } from "@/lib/web-presence";

type Listener = (...arguments_: never[]) => void;

const toPlayerPresence = (
  presence: BasicPresence | PresenceWithLocation,
): PlayerPresence | undefined => {
  if (!presence.character) return undefined;
  const location = "location" in presence ? presence.location : undefined;

  return {
    ...presence.character,
    margonemAccountVerified: presence.confidence === "verified",
    mapId: location?.mapId,
    mapName: location?.map,
    isAfk: presence.isAfk,
    updatedAt: presence.lastSeen,
    sessionId: presence.sessionId,
  };
};

export interface PlayerPresence {
  world: string;
  name: string;
  characterId: string;
  accountId: string;
  icon: string;
  lvl: number;
  prof: string;
  margonemAccountVerified?: boolean;
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;
  sessionId: string;
}

type ForbiddenPresence = {
  status: "forbidden";
  code: "ONLINE_PLAYERS_ACCESS_DENIED";
};

export type OrganizationPresenceResponse =
  | {
      status: "success";
      players: Record<string, PlayerPresence[]>;
      sessions: Record<string, { sessionId: string }[]>;
    }
  | ForbiddenPresence
  | { status: "unavailable" };

const groupPresence = <TValue>(
  presences: ReadonlyArray<BasicPresence | PresenceWithLocation>,
  platform: "game" | "web-app",
  toValue: (
    presence: BasicPresence | PresenceWithLocation,
  ) => TValue | undefined,
) => {
  const grouped: Record<string, TValue[]> = {};

  for (const presence of presences) {
    if (presence.platform !== platform) continue;
    const value = toValue(presence);

    if (!value) continue;
    (grouped[presence.discordId ?? presence.userId] ??= []).push(value);
  }

  return grouped;
};

/** Server events delivered to listeners under their protocol type. */
const FORWARDED_EVENT_TYPES = [
  "feed.entry",
  "kills.changed",
  "loot.created",
  "loot.share-updated",
  "loot.snapshot",
  "timer.created",
  "timer.deleted",
  "hero-sighting.updated",
  "reservation.created",
  "reservation.deleted",
  "reservation.changed",
  "member-refresh.updated",
  "event.map-status-updated",
  "event.hero-killed",
  "event.ranking-updated",
  "event.respawn-window-opened",
  "event.respawn-window-closed",
] as const satisfies ReadonlyArray<ServerEvent["type"]>;

type ForwardedEventType = (typeof FORWARDED_EVENT_TYPES)[number];

const forwardedEventTypes: ReadonlySet<string> = new Set(FORWARDED_EVENT_TYPES);

const isForwardedEventType = (type: string): type is ForwardedEventType =>
  forwardedEventTypes.has(type);

/** A joined session and what changed in its access since the previous one. */
export type GatewayJoin = {
  readonly guildIds: readonly string[];
  readonly accessPolicyChanges: readonly AccessPolicyChange[];
  /** Whether listeners recover events the page's initial reads missed. */
  readonly recover: boolean;
};

/** A new access policy; `accessPolicyChanges` is unknown without a baseline. */
export type GatewayAccessUpdate = {
  readonly organizationIds: readonly string[];
  readonly accessPolicyChanges?: readonly AccessPolicyChange[];
};

/**
 * What GatewayClient listeners hear: forwarded server events, and the events
 * of the connection itself:
 * - `connect` and `disconnect` follow the transport;
 * - `join` carries a {@link GatewayJoin};
 * - `access.updated` carries a {@link GatewayAccessUpdate};
 * - `game-presence.changed` carries a `GamePresenceUpdatePayload`;
 * - `web-presence.changed` carries a `MemberWebPresenceUpdatePayload`.
 */
export type GatewayClientEvent =
  | ForwardedEventType
  | "connect"
  | "disconnect"
  | "join"
  | "access.updated"
  | "game-presence.changed"
  | "web-presence.changed";

// Production joins complete 150–250 ms after the first connect. A slower first
// join may follow events that the page's initial HTTP reads could not include.
const FRESH_JOIN_WINDOW_MS = 2_000;

export class GatewayClient {
  private readonly realtime = new RealtimeClient({
    url: GATEWAY_URL,
    path: GATEWAY_SOCKET_PATH || "/ws",
  });
  private readonly listeners = new RealtimeEventListeners<GatewayClientEvent>();
  private wasConnected = false;
  private accessPolicy: AccessPolicySnapshot | undefined;
  private hasJoined = false;
  private firstConnectAt: number | undefined;

  constructor() {
    // GatewayProvider owns joins after current user and Organization data are ready.
    this.realtime.setReconnectHandler(async () => {});
    this.realtime.subscribe((event) => this.handleServerEvent(event));
    this.realtime.subscribeState((state) => {
      const connected =
        state === "connected" || state === "joining" || state === "ready";

      if (connected === this.wasConnected) return;
      this.wasConnected = connected;
      this.listeners.emit(connected ? "connect" : "disconnect");
    });
  }

  get connected(): boolean {
    return this.wasConnected;
  }

  connect(): void {
    this.firstConnectAt ??= Date.now();
    this.realtime.connect();
  }

  disconnect(): void {
    this.realtime.disconnect();
  }

  on(event: GatewayClientEvent, listener: Listener): this {
    this.listeners.add(event, listener);

    return this;
  }

  off(event: GatewayClientEvent, listener: Listener): this {
    this.listeners.delete(event, listener);

    return this;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  /** Joins the signed-in user's Lootlogs; `join` follows once it succeeds. */
  join(): void {
    void this.realtime.join({}).catch(() => undefined);
  }

  async fetchPresence(guildId: string): Promise<OrganizationPresenceResponse> {
    try {
      const { presences } = await this.realtime.request("presence.fetch", {
        organizationId: guildId,
        delivery: "response",
      });

      return {
        status: "success",
        players: groupPresence(presences, "game", toPlayerPresence),
        sessions: groupPresence(presences, "web-app", (presence) => ({
          sessionId: presence.sessionId,
        })),
      };
    } catch (error) {
      // The deployed gateway uses COMMAND_REJECTED for all command failures.
      if (
        error instanceof RealtimeRequestError &&
        error.code === "COMMAND_REJECTED" &&
        !error.retryable &&
        error.message === "organization access denied"
      ) {
        return { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" };
      }

      return { status: "unavailable" };
    }
  }

  private updateAccessPolicy(next: AccessPolicySnapshot) {
    const previous = this.accessPolicy;
    this.accessPolicy = next;

    // Without a baseline, such as the empty update sent before a join is
    // rejected, the changes are unknown and may revoke cached data.
    return previous && diffAccessPolicies(previous, next);
  }

  private handleServerEvent(event: ServerEvent): void {
    if (event.type === "session.joined") {
      // Listeners recover missed events unless this join subscribed right
      // after the page's initial HTTP reads.
      const recover =
        this.hasJoined ||
        this.firstConnectAt === undefined ||
        Date.now() - this.firstConnectAt > FRESH_JOIN_WINDOW_MS;

      // The first join's snapshot describes the access the page's HTTP data
      // was loaded under.
      const accessPolicyChanges =
        this.updateAccessPolicy(event.data.accessPolicy) ?? [];

      this.hasJoined = true;

      if (event.data.organizationIds.length > 0) {
        void this.realtime
          .request("presence.publish", {
            organizationIds: [...event.data.organizationIds],
            isAfk: false,
          })
          .catch(() => undefined);
      }

      this.listeners.emit("join", {
        guildIds: [...event.data.organizationIds],
        accessPolicyChanges,
        recover,
      } satisfies GatewayJoin);

      return;
    }

    if (event.type === "permissions.updated") {
      const accessPolicyChanges = this.updateAccessPolicy(
        event.data.accessPolicy,
      );

      if (event.data.organizationIds.length > 0) {
        void this.realtime
          .request("presence.publish", {
            organizationIds: [...event.data.organizationIds],
            isAfk: false,
          })
          .catch(() => undefined);
      }

      this.listeners.emit("access.updated", {
        organizationIds: [...event.data.organizationIds],
        accessPolicyChanges,
      } satisfies GatewayAccessUpdate);

      return;
    }

    if (event.type === "presence.delta") {
      for (const change of event.data.changes) {
        if (change.action === "upsert") {
          this.dispatchPresence(event.data.organizationId, change.presence);
        } else {
          this.dispatchPresenceRemoval(
            event.data.organizationId,
            change.discordId ?? change.userId,
            change.sessionId,
          );
        }
      }

      return;
    }

    if (isForwardedEventType(event.type))
      this.listeners.emit(event.type, unwrapOrganizationEvent(event));
  }

  private dispatchPresence(
    guildId: string,
    presence: BasicPresence | PresenceWithLocation,
  ): void {
    const base = {
      guildId,
      discordId: presence.discordId ?? presence.userId,
      sessionId: presence.sessionId,
      status: presence.status,
    };

    if (presence.platform === "web-app") {
      this.listeners.emit(
        "web-presence.changed",
        base satisfies MemberWebPresenceUpdatePayload,
      );

      return;
    }

    this.listeners.emit("game-presence.changed", {
      ...base,
      player: toPlayerPresence(presence),
    } satisfies GamePresenceUpdatePayload);
  }

  private dispatchPresenceRemoval(
    guildId: string,
    discordId: string,
    sessionId: string,
  ): void {
    const payload = {
      guildId,
      discordId,
      sessionId,
      status: "offline",
    } as const;

    this.listeners.emit("web-presence.changed", payload);
    this.listeners.emit("game-presence.changed", payload);
  }
}

export const socket = new GatewayClient();
