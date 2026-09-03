import {
  GATEWAY_SOCKET_PATH,
  GATEWAY_URL,
  GatewayEvent,
} from "@/config/gateway";
import { resolvePresenceOrganizationIds } from "@/lib/presence-organization-selection";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import {
  RealtimeClient,
  type BasicPresence,
  type PresenceWithLocation,
  type ServerEvent,
} from "@lootlog/client/realtime";
import {
  requestMargonemAccountProof,
  type MargonemAccountProof,
} from "@/lib/margonem-account-proof";
import { requestRealtimeTicket } from "@/lib/realtime-ticket";

type Listener = (...arguments_: never[]) => void;

export type PermissionsUpdatedPayload = {
  guilds?: { guild: { id: string } }[];
  featureRooms?: string[];
};

export interface GameSessionJoinData {
  readonly world: string;
  readonly name: string;
  readonly lvl: number;
  readonly icon: string;
  readonly prof: string;
  readonly characterId: string;
  readonly accountId: string;
  readonly clan?: {
    readonly id: number;
    readonly name: string;
    readonly rank: number;
  };
}

interface JoinResult {
  readonly connectionId: string;
  readonly organizationIds: string[];
}

const isJoinResult = (value: unknown): value is JoinResult =>
  Boolean(
    value &&
    typeof value === "object" &&
    "connectionId" in value &&
    typeof value.connectionId === "string" &&
    "organizationIds" in value &&
    Array.isArray(value.organizationIds) &&
    value.organizationIds.every((id) => typeof id === "string"),
  );

const unwrapOrganizationEvent = (event: ServerEvent): unknown => {
  if (!event.data || typeof event.data !== "object") return event.data;
  return "payload" in event.data ? event.data.payload : event.data;
};

const toLegacyPresence = (guildId: string, presence: BasicPresence) => {
  const location =
    "location" in presence
      ? (presence as PresenceWithLocation).location
      : undefined;
  return {
    discordId: presence.userId,
    guildId,
    sessionId: presence.sessionId,
    platform: presence.platform,
    status: presence.status,
    player: presence.character
      ? {
          ...presence.character,
          margonemAccountVerified: presence.confidence === "verified",
          mapName: location?.map,
          sessionId: presence.sessionId,
          isAfk: presence.isAfk,
          updatedAt: presence.lastSeen,
          location: location
            ? { x: location.x, y: location.y, map: location.map }
            : undefined,
        }
      : undefined,
  };
};

const legacyEventNames: Partial<Record<ServerEvent["type"], GatewayEvent>> = {
  "chat.created": GatewayEvent.CHAT_MESSAGE,
  "chat.updated": GatewayEvent.CHAT_MESSAGE_UPDATE,
  "chat.deleted": GatewayEvent.CHAT_MESSAGE_DELETE,
  "chat.cleared": GatewayEvent.CHAT_MESSAGES_CLEAR,
  "timer.created": GatewayEvent.TIMERS_CREATE,
  "timer.deleted": GatewayEvent.TIMERS_DELETE,
  "notification.sent": GatewayEvent.NOTIFICATION,
  "member-refresh.updated": GatewayEvent.MEMBERS_REFRESH_JOB_UPDATE,
  "party-gathering.updated": GatewayEvent.PARTY_GATHERING_SEND,
  "party-gathering.cancelled": GatewayEvent.PARTY_GATHERING_CANCEL,
  "party-ready-room.updated": GatewayEvent.PARTY_READY_ROOM_UPDATE,
  "map-ping.received": GatewayEvent.MAP_PING_RECEIVE,
  "air-tag.updated": GatewayEvent.AIR_TAG_UPDATE,
  "event.map-status-updated": GatewayEvent.EVENT_MAP_STATUS_UPDATE,
  "event.hero-killed": GatewayEvent.EVENT_HERO_KILLED,
  "event.ranking-updated": GatewayEvent.EVENT_RANKING_UPDATE,
};

export class AppSocket {
  private readonly realtime = new RealtimeClient({
    url: GATEWAY_URL,
    path: GATEWAY_SOCKET_PATH || "/ws",
    protocols: ["lootlog.realtime.v1"],
    ticketProvider: requestRealtimeTicket,
  });
  private readonly listeners = new Map<GatewayEvent, Set<Listener>>();
  private joinedOrganizationIds: string[] = [];
  private readonly connectionReadyWaiters = new Set<(id: string) => void>();
  private lastIsAfk = false;
  private wasConnected = false;
  private lastJoinData: GameSessionJoinData | null = null;
  id: string | undefined;

  constructor() {
    this.realtime.setReconnectHandler(async () => {
      if (this.lastJoinData) await this.join(this.lastJoinData);
    });
    this.realtime.subscribe((event) => this.handleServerEvent(event));
    this.realtime.subscribeState((state) => {
      const connected =
        state === "connected" || state === "joining" || state === "ready";
      if (connected === this.wasConnected) return;
      this.wasConnected = connected;
      if (state === "disconnected") this.id = undefined;
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

  removeAllListeners(): void {
    this.listeners.clear();
  }

  hasListeners(event: GatewayEvent): boolean {
    return (this.listeners.get(event)?.size ?? 0) > 0;
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

  async join(
    data: GameSessionJoinData,
    margonemAccountProof?: MargonemAccountProof,
  ): Promise<JoinResult> {
    this.lastJoinData = data;
    let proof = margonemAccountProof;
    if (!proof) {
      const connectionId = await this.waitForConnectionId();
      proof = await requestMargonemAccountProof({
        socketId: connectionId,
        accountId: data.accountId,
        characterId: data.characterId,
        clanId: data.clan?.id,
      }).catch(() => undefined);
    }
    const response = await this.realtime.join({
      world: data.world,
      character: {
        world: data.world,
        name: data.name,
        lvl: data.lvl,
        icon: data.icon,
        characterId: data.characterId,
        accountId: data.accountId,
        prof: data.prof,
        clan: data.clan,
      },
      margonemAccountProof: proof,
    });
    if (!isJoinResult(response))
      throw new Error("Invalid session.join response");
    this.id = response.connectionId;
    this.joinedOrganizationIds = [...response.organizationIds];
    this.dispatchJoin(response);
    return response;
  }

  emit<Response = unknown>(
    event: GatewayEvent,
    payload?: unknown,
    acknowledgement?: (response: Response) => void,
  ): this {
    if (event === GatewayEvent.PLAYER_PRESENCE_UPDATE) {
      const update = payload as { isAfk?: boolean } | undefined;
      if (update?.isAfk !== undefined) this.lastIsAfk = update.isAfk;
      void this.publishPresence();
      return this;
    }
    void this.requestLegacy(event, payload)
      .then((response) => acknowledgement?.(response as Response))
      .catch(() => undefined);
    return this;
  }

  emitWithAck<Response = unknown>(
    event: GatewayEvent,
    payload?: unknown,
  ): Promise<Response | undefined> {
    return this.requestLegacy(event, payload) as Promise<Response | undefined>;
  }

  timeout(timeoutMs: number) {
    const withTimeout = <Response>(promise: Promise<Response>) =>
      Promise.race([
        promise,
        new Promise<Response>((_resolve, reject) =>
          setTimeout(
            () => reject(new Error("Realtime acknowledgement timeout")),
            timeoutMs,
          ),
        ),
      ]);
    return {
      emit: <Response = unknown>(
        event: GatewayEvent,
        payload: unknown,
        acknowledgement: (error: Error | null, response?: Response) => void,
      ) => {
        void withTimeout(this.requestLegacy(event, payload))
          .then((response) => acknowledgement(null, response as Response))
          .catch((error) =>
            acknowledgement(
              error instanceof Error ? error : new Error(String(error)),
            ),
          );
      },
      emitWithAck: <Response = unknown>(
        event: GatewayEvent,
        payload: unknown,
      ) => withTimeout(this.requestLegacy(event, payload)) as Promise<Response>,
    };
  }

  private async publishPresence(): Promise<void> {
    const game = useGameStore.getState().game;
    if (!game) return;
    const settings = useSettingsStore.getState();
    const configured =
      settings.presenceOrganizationIdsByCharId[game.hero.characterId];
    const organizationIds = resolvePresenceOrganizationIds({
      accessibleOrganizations: this.joinedOrganizationIds.map((id) => ({ id })),
      currentClanId: game.hero.clan?.id,
      explicitlySelectedIds: configured,
      preferredOrganizationId: settings.guildIdByCharId[game.hero.characterId],
    });
    await this.realtime.request("presence.publish", {
      organizationIds,
      isAfk: this.lastIsAfk,
      character: {
        world: game.world,
        name: game.hero.name,
        lvl: game.hero.level,
        icon: game.hero.icon,
        characterId: game.hero.characterId,
        accountId: game.hero.accountId,
        prof: game.hero.profession,
        clan: game.hero.clan,
      },
      location: {
        mapId: game.map.id,
        map: game.map.name,
        x: game.hero.x,
        y: game.hero.y,
      },
      clientObservedAt: Date.now(),
    });
  }

  private async requestLegacy(
    event: GatewayEvent,
    payload: unknown,
  ): Promise<unknown> {
    if (event === GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH) {
      const data = payload as { guildId: string; world?: string };
      try {
        const response = (await this.realtime.request("presence.fetch", {
          organizationId: data.guildId,
          world: data.world,
        })) as { presences?: BasicPresence[] };
        const players: Record<string, unknown[]> = {};
        for (const presence of response.presences ?? []) {
          if (presence.platform !== "game") continue;
          (players[presence.userId] ??= []).push(
            toLegacyPresence(data.guildId, presence),
          );
        }
        return { status: "success", players };
      } catch {
        return { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" };
      }
    }
    if (event === GatewayEvent.MAP_PING_SEND) {
      return this.realtime.request("map-ping.send", payload as never);
    }
    if (event === GatewayEvent.AIR_TAG_SUBSCRIPTION) {
      const data = payload as {
        requestId: string;
        enabled: boolean;
        expectedMapId?: number;
      };
      return this.realtime.request("air-tag.subscription", {
        requestId: data.requestId,
        enabled: data.enabled,
        expectedMapId: data.expectedMapId,
      });
    }
    if (event === GatewayEvent.AIR_TAG_OBSERVATION) {
      const data = payload as {
        expectedMapId: number;
        observations: unknown[];
      };
      return this.realtime.request("air-tag.observation", data as never);
    }
    return undefined;
  }

  private handleServerEvent(event: ServerEvent): void {
    if (event.type === "connection.ready") {
      this.id = event.data.connectionId;
      for (const resolve of this.connectionReadyWaiters) {
        resolve(event.data.connectionId);
      }
      this.connectionReadyWaiters.clear();
      return;
    }
    if (event.type === "session.joined") {
      this.id = event.data.connectionId;
      this.joinedOrganizationIds = [...event.data.organizationIds];
      return;
    }
    if (event.type === "permissions.updated") {
      this.joinedOrganizationIds = [...event.data.organizationIds];
      this.dispatch(GatewayEvent.PERMISSIONS_UPDATED, {
        guilds: event.data.organizationIds.map((id) => ({ guild: { id } })),
        featureRooms: event.data.subscriptionScopes.map((scope) => scope.topic),
      });
      void this.publishPresence();
      return;
    }
    if (event.type === "presence.snapshot") {
      for (const presence of event.data.presences) {
        this.dispatch(
          GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
          toLegacyPresence(event.data.organizationId, presence),
        );
      }
      return;
    }
    if (event.type === "presence.delta") {
      for (const change of event.data.changes) {
        const payload =
          change.action === "upsert"
            ? toLegacyPresence(event.data.organizationId, change.presence)
            : {
                discordId: change.userId,
                guildId: event.data.organizationId,
                sessionId: change.sessionId,
                status: "offline",
              };
        this.dispatch(GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE, payload);
      }
      return;
    }
    const legacyEvent = legacyEventNames[event.type];
    if (legacyEvent) {
      const payload =
        event.type === "map-ping.received" || event.type === "air-tag.updated"
          ? event.data
          : unwrapOrganizationEvent(event);
      this.dispatch(legacyEvent, payload);
    }
  }

  private dispatch(event: GatewayEvent, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) {
      (listener as (value?: unknown) => void)(payload);
    }
  }

  private dispatchJoin(result: JoinResult): void {
    this.dispatch(GatewayEvent.JOIN, {
      status: "success",
      guildsCount: result.organizationIds.length,
      guildIds: [...result.organizationIds],
    });
  }

  private waitForConnectionId(): Promise<string> {
    if (this.id) return Promise.resolve(this.id);
    return new Promise((resolve) => {
      this.connectionReadyWaiters.add(resolve);
    });
  }
}

let socket: AppSocket | null = null;

export const getSocket = (): AppSocket => {
  socket ??= new AppSocket();
  return socket;
};

export const disposeSocket = (): void => {
  const activeSocket = socket;
  if (!activeSocket) return;
  socket = null;
  activeSocket.disconnect();
  activeSocket.removeAllListeners();
};
