import {
  GATEWAY_SOCKET_PATH,
  GATEWAY_URL,
  GatewayEvent,
} from "@/config/gateway";
import { authControllerIssueRealtimeTicket } from "@lootlog/client/auth";
import {
  REALTIME_SUBPROTOCOL,
  RealtimeClient,
  type BasicPresence,
  type PresenceWithLocation,
  type ServerEvent,
} from "@lootlog/client/realtime";

type Listener = (...arguments_: never[]) => void;

const unwrapOrganizationEvent = (event: ServerEvent): unknown => {
  if (!event.data || typeof event.data !== "object") return event.data;
  return "payload" in event.data ? event.data.payload : event.data;
};

const toLegacyPlayer = (presence: BasicPresence) => {
  if (!presence.character) return undefined;
  const location =
    "location" in presence
      ? (presence as PresenceWithLocation).location
      : undefined;
  return {
    ...presence.character,
    lvl: String(presence.character.lvl),
    margonemAccountVerified: presence.confidence === "verified",
    mapId: location?.mapId,
    mapName: location?.map,
    isAfk: presence.isAfk,
    updatedAt: presence.lastSeen,
    sessionId: presence.sessionId,
  };
};

const groupPresence = (
  presences: ReadonlyArray<BasicPresence>,
  platform: "game" | "web-app",
): Record<string, unknown[]> => {
  const grouped: Record<string, unknown[]> = {};
  for (const presence of presences) {
    if (presence.platform !== platform) continue;
    const value =
      platform === "game"
        ? toLegacyPlayer(presence)
        : { sessionId: presence.sessionId };
    if (!value) continue;
    (grouped[presence.userId] ??= []).push(value);
  }
  return grouped;
};

const serverEventNames: Partial<Record<ServerEvent["type"], GatewayEvent>> = {
  "chat.created": GatewayEvent.CHAT_MESSAGE,
  "loot.created": GatewayEvent.LOOTS_CREATE,
  "loot.share-updated": GatewayEvent.LOOTS_SHARE_UPDATE,
  "timer.created": GatewayEvent.TIMERS_CREATE,
  "timer.deleted": GatewayEvent.TIMERS_DELETE,
  "reservation.created": GatewayEvent.RESERVATIONS_CREATE,
  "reservation.deleted": GatewayEvent.RESERVATIONS_DELETE,
  "reservation.changed": GatewayEvent.RESERVATIONS_CHANGED,
  "notification.sent": GatewayEvent.NOTIFICATION,
  "member-refresh.updated": GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
  "event.map-status-updated": GatewayEvent.EVENT_MAP_STATUS_UPDATE,
  "event.hero-killed": GatewayEvent.EVENT_HERO_KILLED,
  "event.ranking-updated": GatewayEvent.EVENT_RANKING_UPDATE,
  "event.respawn-window-opened": GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED,
  "event.respawn-window-closed": GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED,
};

export class GatewayClient {
  private readonly realtime = new RealtimeClient({
    url: GATEWAY_URL,
    path: GATEWAY_SOCKET_PATH || "/ws",
    protocols: [REALTIME_SUBPROTOCOL],
    ticketProvider: async () =>
      (await authControllerIssueRealtimeTicket()).ticket,
  });
  private readonly listeners = new Map<GatewayEvent, Set<Listener>>();
  private wasConnected = false;

  constructor() {
    this.realtime.subscribe((event) => this.handleServerEvent(event));
    this.realtime.subscribeState((state) => {
      const connected =
        state === "connected" || state === "joining" || state === "ready";
      if (connected === this.wasConnected) return;
      this.wasConnected = connected;
      this.dispatch(connected ? GatewayEvent.CONNECT : GatewayEvent.DISCONNECT);
    });
  }

  get connected(): boolean {
    return this.wasConnected;
  }

  connect(): void {
    this.realtime.connect();
  }

  disconnect(): void {
    this.realtime.disconnect();
  }

  on(event: GatewayEvent, listener: Listener): this {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: GatewayEvent, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  emit<Response = unknown>(
    event: GatewayEvent,
    payload?: unknown,
    acknowledgement?: (response?: Response) => void,
  ): this {
    if (event === GatewayEvent.JOIN) {
      void this.realtime.join({}).catch(() => undefined);
      return this;
    }
    if (
      event === GatewayEvent.EVENT_PRESENCE_FETCH ||
      event === GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH ||
      event === GatewayEvent.MEMBER_WEB_PRESENCE_FETCH
    ) {
      const request = payload as
        | { guildId?: string; world?: string }
        | undefined;
      if (!request?.guildId) return this;
      void this.realtime
        .request("presence.fetch", {
          organizationId: request.guildId,
          world: request.world,
        })
        .then((response) => {
          const snapshot = response as { presences?: BasicPresence[] };
          const presences = snapshot.presences ?? [];
          if (event === GatewayEvent.MEMBER_WEB_PRESENCE_FETCH) {
            acknowledgement?.({
              status: "success",
              sessions: groupPresence(presences, "web-app"),
            } as Response);
          } else {
            acknowledgement?.({
              status: "success",
              players: groupPresence(presences, "game"),
            } as Response);
          }
        })
        .catch(() =>
          acknowledgement?.({
            status: "forbidden",
            code: "ONLINE_PLAYERS_ACCESS_DENIED",
          } as Response),
        );
    }
    return this;
  }

  private handleServerEvent(event: ServerEvent): void {
    if (event.type === "session.joined") {
      if (event.data.organizationIds.length > 0) {
        void this.realtime
          .request("presence.publish", {
            organizationIds: [...event.data.organizationIds],
            isAfk: false,
          })
          .catch(() => undefined);
      }
      this.dispatch(GatewayEvent.JOIN, {
        status: "success",
        guildsCount: event.data.organizationIds.length,
        guildIds: [...event.data.organizationIds],
      });
      return;
    }
    if (event.type === "permissions.updated") {
      if (event.data.organizationIds.length > 0) {
        void this.realtime
          .request("presence.publish", {
            organizationIds: [...event.data.organizationIds],
            isAfk: false,
          })
          .catch(() => undefined);
      }
      this.dispatch(GatewayEvent.PERMISSIONS_UPDATED, {
        guilds: event.data.organizationIds.map((id) => ({ guild: { id } })),
        featureRooms: event.data.subscriptionScopes.map((scope) => scope.topic),
      });
      return;
    }
    if (event.type === "presence.snapshot") {
      for (const presence of event.data.presences) {
        this.dispatchPresence(event.data.organizationId, presence, false);
      }
      return;
    }
    if (event.type === "presence.delta") {
      for (const change of event.data.changes) {
        if (change.action === "upsert") {
          this.dispatchPresence(
            event.data.organizationId,
            change.presence,
            false,
          );
        } else {
          this.dispatchPresenceRemoval(
            event.data.organizationId,
            change.userId,
            change.sessionId,
          );
        }
      }
      return;
    }
    const legacyEvent = serverEventNames[event.type];
    if (legacyEvent) this.dispatch(legacyEvent, unwrapOrganizationEvent(event));
  }

  private dispatchPresence(
    guildId: string,
    presence: BasicPresence,
    disconnected: boolean,
  ): void {
    const base = {
      guildId,
      discordId: presence.userId,
      sessionId: presence.sessionId,
      status: disconnected ? "offline" : presence.status,
      disconnected,
    };
    if (presence.platform === "web-app") {
      this.dispatch(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, base);
      return;
    }
    this.dispatch(GatewayEvent.EVENT_PRESENCE_UPDATE, {
      ...base,
      player: toLegacyPlayer(presence),
    });
  }

  private dispatchPresenceRemoval(
    guildId: string,
    userId: string,
    sessionId: string,
  ): void {
    const payload = {
      guildId,
      discordId: userId,
      sessionId,
      status: "offline",
      disconnected: true,
    };
    this.dispatch(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, payload);
    this.dispatch(GatewayEvent.EVENT_PRESENCE_UPDATE, payload);
  }

  private dispatch(event: GatewayEvent, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      (listener as (value?: unknown) => void)(payload);
    }
  }
}

export const socket = new GatewayClient();
