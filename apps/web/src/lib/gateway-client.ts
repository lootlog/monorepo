import { decodePresenceSnapshot } from "@lootlog/protocol/realtime/codec";
import {
  REALTIME_FEED_CAPABILITY,
  REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY,
} from "@lootlog/protocol/realtime";
import {
  RealtimeEventListeners,
  unwrapOrganizationEvent,
} from "@lootlog/client/realtime/event-listeners";
import {
  GATEWAY_SOCKET_PATH,
  GATEWAY_URL,
  GatewayEvent,
} from "@/config/gateway";
import {
  REALTIME_SUBPROTOCOL,
  REALTIME_JSON_SUBPROTOCOL,
  RealtimeClient,
  type BasicPresence,
  type PresenceWithLocation,
  type ServerEvent,
} from "@lootlog/client/realtime";

type Listener = (...arguments_: never[]) => void;

const toLegacyPlayer = (presence: BasicPresence | PresenceWithLocation) => {
  if (!presence.character) return undefined;
  const location = "location" in presence ? presence.location : undefined;

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

export interface PlayerPresence {
  world: string;
  name: string;
  characterId: string;
  accountId: string;
  icon: string;
  lvl: string;
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

export type PlayerPresenceResponse =
  | { status: "success"; players: Record<string, PlayerPresence[]> }
  | ForbiddenPresence;

export type WebPresenceResponse =
  | { status: "success"; sessions: Record<string, { sessionId: string }[]> }
  | ForbiddenPresence;

type PresenceRequest = { guildId?: string; world?: string };

type EmitArguments =
  | [event: GatewayEvent.JOIN, payload?: PresenceRequest]
  | [
      event:
        | GatewayEvent.EVENT_PRESENCE_FETCH
        | GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH,
      payload?: PresenceRequest,
      acknowledgement?: (response?: PlayerPresenceResponse) => void,
    ]
  | [
      event: GatewayEvent.MEMBER_WEB_PRESENCE_FETCH,
      payload?: PresenceRequest,
      acknowledgement?: (response?: WebPresenceResponse) => void,
    ];

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

const serverEventNames: Partial<Record<ServerEvent["type"], GatewayEvent>> = {
  "chat.created": GatewayEvent.CHAT_MESSAGE,
  "feed.entry": GatewayEvent.FEED_ENTRY,
  "kills.changed": GatewayEvent.KILLS_CHANGED,
  "loot.created": GatewayEvent.LOOTS_CREATE,
  "loot.share-updated": GatewayEvent.LOOTS_SHARE_UPDATE,
  "timer.created": GatewayEvent.TIMERS_CREATE,
  "timer.deleted": GatewayEvent.TIMERS_DELETE,
  "reservation.created": GatewayEvent.RESERVATIONS_CREATE,
  "reservation.deleted": GatewayEvent.RESERVATIONS_DELETE,
  "reservation.changed": GatewayEvent.RESERVATIONS_CHANGED,
  "notification.sent": GatewayEvent.NOTIFICATION,
  "notification.volunteer": GatewayEvent.NOTIFICATIONS_VOLUNTEER,
  "member-refresh.updated": GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
  "event.map-status-updated": GatewayEvent.EVENT_MAP_STATUS_UPDATE,
  "event.hero-killed": GatewayEvent.EVENT_HERO_KILLED,
  "event.ranking-updated": GatewayEvent.EVENT_RANKING_UPDATE,
  "event.respawn-window-opened": GatewayEvent.EVENT_RESPAWN_WINDOW_OPENED,
  "event.respawn-window-closed": GatewayEvent.EVENT_RESPAWN_WINDOW_CLOSED,
};

export class GatewayClient {
  private readonly readable =
    import.meta.env.VITE_GATEWAY_FRAME_ENCODING === "json";
  private readonly realtime = new RealtimeClient({
    url: GATEWAY_URL,
    path: GATEWAY_SOCKET_PATH || "/ws",
    protocols: [
      this.readable ? REALTIME_JSON_SUBPROTOCOL : REALTIME_SUBPROTOCOL,
      REALTIME_FEED_CAPABILITY,
      REALTIME_NOTIFICATION_VOLUNTEER_CAPABILITY,
    ],
    frameEncoding: this.readable ? "json" : "messagepack",
  });
  private readonly listeners = new RealtimeEventListeners<GatewayEvent>();
  private wasConnected = false;

  constructor() {
    this.realtime.subscribe((event) => this.handleServerEvent(event));
    this.realtime.subscribeState((state) => {
      const connected =
        state === "connected" || state === "joining" || state === "ready";

      if (connected === this.wasConnected) return;
      this.wasConnected = connected;
      this.listeners.emit(
        connected ? GatewayEvent.CONNECT : GatewayEvent.DISCONNECT,
      );
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
    this.listeners.add(event, listener);

    return this;
  }

  off(event: GatewayEvent, listener: Listener): this {
    this.listeners.delete(event, listener);

    return this;
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  emit(...[event, payload, acknowledgement]: EmitArguments): this {
    if (event === GatewayEvent.JOIN) {
      void this.realtime.join({}).catch(() => undefined);

      return this;
    }

    if (!payload?.guildId) return this;
    void this.realtime
      .request("presence.fetch", {
        organizationId: payload.guildId,
        world: payload.world,
      })
      .then((response) => {
        const { presences } = decodePresenceSnapshot(response);

        if (event === GatewayEvent.MEMBER_WEB_PRESENCE_FETCH) {
          acknowledgement?.({
            status: "success",
            sessions: groupPresence(presences, "web-app", (presence) => ({
              sessionId: presence.sessionId,
            })),
          });
        } else {
          acknowledgement?.({
            status: "success",
            players: groupPresence(presences, "game", toLegacyPlayer),
          });
        }
      })
      .catch(() =>
        acknowledgement?.({
          status: "forbidden",
          code: "ONLINE_PLAYERS_ACCESS_DENIED",
        }),
      );

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

      this.listeners.emit(GatewayEvent.JOIN, {
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

      this.listeners.emit(GatewayEvent.PERMISSIONS_UPDATED, {
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
            change.discordId ?? change.userId,
            change.sessionId,
          );
        }
      }

      return;
    }

    const legacyEvent = serverEventNames[event.type];

    if (legacyEvent)
      this.listeners.emit(legacyEvent, unwrapOrganizationEvent(event));
  }

  private dispatchPresence(
    guildId: string,
    presence: BasicPresence | PresenceWithLocation,
    disconnected: boolean,
  ): void {
    const base = {
      guildId,
      discordId: presence.discordId ?? presence.userId,
      sessionId: presence.sessionId,
      status: disconnected ? "offline" : presence.status,
      disconnected,
    };

    if (presence.platform === "web-app") {
      this.listeners.emit(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, base);

      return;
    }

    this.listeners.emit(GatewayEvent.EVENT_PRESENCE_UPDATE, {
      ...base,
      player: toLegacyPlayer(presence),
    });
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
      disconnected: true,
    };

    this.listeners.emit(GatewayEvent.MEMBER_WEB_PRESENCE_UPDATE, payload);
    this.listeners.emit(GatewayEvent.EVENT_PRESENCE_UPDATE, payload);
  }
}

export const socket = new GatewayClient();
