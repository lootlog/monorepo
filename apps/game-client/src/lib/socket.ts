import {
  isMapPingAcknowledgement,
  isAirTagSubscriptionAcknowledgement,
  isAirTagObservationAcknowledgement,
  isPresenceFetchResult,
} from "@lootlog/protocol/realtime/codec";
import type {
  AirTagSubscriptionCommand,
  AirTagObservationCommand,
  AirTagSubscriptionAck,
  AirTagObservationAck,
  MapPingCommand,
  MapPingAckSchema,
} from "@lootlog/protocol/realtime";
import type { PlayerPresenceAckPayload } from "@/lib/online-players-presence";
import {
  RealtimeEventListeners,
  unwrapOrganizationEvent,
} from "@lootlog/client/realtime/event-listeners";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import {
  RealtimeRequestError,
  type BasicPresence,
  type PresenceWithLocation,
  type ServerEvent,
} from "@lootlog/client/realtime";
import {
  requestMargonemAccountProof,
  type MargonemAccountProof,
} from "@/lib/margonem-account-proof";
import { getGameClientPlatform } from "@/lib/game-client-platform";

import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
  isAccessPolicySnapshot,
  type AccessPolicySnapshot,
  type AccessPolicyChange,
} from "@lootlog/protocol/realtime/access-policy";

type Listener = (...arguments_: never[]) => void;

export type PermissionsUpdatedPayload = {
  guilds?: { guild: { id: string } }[];
  featureRooms?: string[];
  accessPolicy?: AccessPolicySnapshot;
  changes?: readonly AccessPolicyChange[];
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
  readonly accessPolicy?: AccessPolicySnapshot;
}

const isJoinResult = (value: unknown): value is JoinResult =>
  Boolean(
    value &&
    typeof value === "object" &&
    "connectionId" in value &&
    typeof value.connectionId === "string" &&
    "organizationIds" in value &&
    Array.isArray(value.organizationIds) &&
    value.organizationIds.every(
      (id: unknown): id is string => typeof id === "string",
    ) &&
    (!("accessPolicy" in value) ||
      value.accessPolicy === undefined ||
      isAccessPolicySnapshot(value.accessPolicy)),
  );

const toLegacyPresence = (
  guildId: string,
  presence: BasicPresence | PresenceWithLocation,
) => {
  const location = "location" in presence ? presence.location : undefined;
  return {
    discordId: presence.discordId ?? presence.userId,
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
  "notification.volunteer": GatewayEvent.NOTIFICATIONS_VOLUNTEER,
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

type SocketCommandPayloads = {
  [GatewayEvent.PLAYER_PRESENCE_UPDATE]: {
    readonly isAfk?: boolean;
    readonly mapId?: number;
    readonly mapName?: string;
  };
  [GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH]: {
    readonly guildId: string;
    readonly world?: string;
  };
  [GatewayEvent.MAP_PING_SEND]: typeof MapPingCommand.fields.data.Type;
  [GatewayEvent.AIR_TAG_SUBSCRIPTION]: typeof AirTagSubscriptionCommand.fields.data.Type;
  [GatewayEvent.AIR_TAG_OBSERVATION]: typeof AirTagObservationCommand.fields.data.Type;
};
type SocketCommandResponses = {
  [GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH]: PlayerPresenceAckPayload;
  [GatewayEvent.MAP_PING_SEND]: typeof MapPingAckSchema.Type;
  [GatewayEvent.AIR_TAG_SUBSCRIPTION]: typeof AirTagSubscriptionAck.Type;
  [GatewayEvent.AIR_TAG_OBSERVATION]: typeof AirTagObservationAck.Type;
};
type SocketPayload<Event extends GatewayEvent> =
  Event extends keyof SocketCommandPayloads
    ? SocketCommandPayloads[Event]
    : undefined;
type SocketResponse<Event extends GatewayEvent> =
  Event extends keyof SocketCommandResponses
    ? SocketCommandResponses[Event]
    : undefined;
type SocketRequest = {
  [Event in GatewayEvent]: [event: Event, payload?: SocketPayload<Event>];
}[GatewayEvent];

export class AppSocket {
  private readonly realtime = getGameClientPlatform().createRealtime();
  private readonly listeners = new RealtimeEventListeners<GatewayEvent>();
  private readonly unsubscribeEvents: () => void;
  private readonly unsubscribeState: () => void;
  private disposed = false;
  private joinedOrganizationIds: string[] = [];
  private lastIsAfk = false;
  private currentAccessPolicy: AccessPolicySnapshot | undefined;
  private wasConnected = false;
  private lastJoinData: GameSessionJoinData | null = null;
  id: string | undefined;

  constructor() {
    this.realtime.setReconnectHandler(async () => {
      if (this.lastJoinData) await this.join(this.lastJoinData);
    });
    this.unsubscribeEvents = this.realtime.subscribe((event) =>
      this.handleServerEvent(event),
    );
    this.unsubscribeState = this.realtime.subscribeState((state) => {
      const connected =
        state === "connected" || state === "joining" || state === "ready";
      if (connected === this.wasConnected) return;
      this.wasConnected = connected;
      if (state === "disconnected") this.id = undefined;
      this.listeners.emit(
        connected ? GatewayEvent.CONNECT : GatewayEvent.DISCONNECT,
      );
    });
  }

  get connected(): boolean {
    return this.wasConnected;
  }

  getAccessPolicy(): AccessPolicySnapshot | undefined {
    return this.currentAccessPolicy;
  }

  connect(): void {
    this.realtime.connect();
  }

  disconnect(): void {
    this.realtime.disconnect();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.disconnect();
    } finally {
      this.unsubscribeEvents();
      this.unsubscribeState();
      this.realtime.setReconnectHandler(null);
      this.removeAllListeners();
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  hasListeners(event: GatewayEvent): boolean {
    return this.listeners.has(event);
  }

  on(event: GatewayEvent, listener: Listener): this {
    this.listeners.add(event, listener);
    return this;
  }

  off(event: GatewayEvent, listener: Listener): this {
    this.listeners.delete(event, listener);
    return this;
  }

  async join(
    data: GameSessionJoinData,
    margonemAccountProof?: MargonemAccountProof,
  ): Promise<JoinResult> {
    if (this.lastJoinData && this.lastJoinData.accountId !== data.accountId) {
      this.currentAccessPolicy = undefined;
    }
    this.lastJoinData = data;
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
      margonemAccountProof,
    });
    if (!isJoinResult(response))
      throw new Error("Invalid session.join response");
    this.id = response.connectionId;
    this.joinedOrganizationIds = [...response.organizationIds];
    if (response.accessPolicy) this.applyAccessPolicy(response.accessPolicy);
    if (margonemAccountProof) {
      this.dispatchJoin(response);
      return response;
    }
    const proof = await requestMargonemAccountProof({
      socketId: response.connectionId,
      accountId: data.accountId,
      characterId: data.characterId,
      clanId: data.clan?.id,
    }).catch(() => undefined);
    if (!proof) {
      this.dispatchJoin(response);
      return response;
    }
    return this.join(data, proof);
  }

  emit<Event extends GatewayEvent>(
    event: Event,
    payload?: SocketPayload<Event>,
    acknowledgement?: (response: SocketResponse<Event>) => void,
  ): this {
    if (event === GatewayEvent.PLAYER_PRESENCE_UPDATE) {
      if (payload && "isAfk" in payload && payload.isAfk !== undefined)
        this.lastIsAfk = payload.isAfk;
      void this.publishPresence();
      return this;
    }
    void this.requestLegacy(event, payload)
      .then((response) => acknowledgement?.(response))
      .catch(() => undefined);
    return this;
  }

  emitWithAck<Event extends GatewayEvent>(
    event: Event,
    payload?: SocketPayload<Event>,
  ): Promise<SocketResponse<Event>> {
    return this.requestLegacy(event, payload);
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
      emit: <Event extends GatewayEvent>(
        event: Event,
        payload: SocketPayload<Event>,
        acknowledgement: (
          error: Error | null,
          response?: SocketResponse<Event>,
        ) => void,
      ) => {
        void withTimeout(this.requestLegacy(event, payload))
          .then((response) => acknowledgement(null, response))
          .catch((error) =>
            acknowledgement(
              error instanceof Error ? error : new Error(String(error)),
            ),
          );
      },
      emitWithAck: <Event extends GatewayEvent>(
        event: Event,
        payload: SocketPayload<Event>,
      ) => withTimeout(this.requestLegacy(event, payload)),
    };
  }

  private async publishPresence(): Promise<void> {
    const game = useGameStore.getState().game;
    if (!game) return;
    // Presence publication opt-out is temporarily disabled; keep stored preferences intact.
    try {
      await this.realtime.request("presence.publish", {
        organizationIds: this.joinedOrganizationIds,
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
    } catch {
      // Presence is best effort; the next publication carries the current state.
      if (import.meta.env.DEV)
        console.warn("[Gateway] Failed to publish presence");
    }
  }

  private async fetchPresence(
    data: SocketCommandPayloads[GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH],
  ): Promise<PlayerPresenceAckPayload> {
    try {
      const response = await this.realtime.request("presence.fetch", {
        organizationId: data.guildId,
        world: data.world,
      });
      if (!isPresenceFetchResult(response))
        throw new Error("Invalid presence.fetch response");
      const players: Record<string, ReturnType<typeof toLegacyPresence>[]> = {};
      for (const presence of response.presences ?? []) {
        if (presence.platform !== "game") continue;
        (players[presence.discordId ?? presence.userId] ??= []).push(
          toLegacyPresence(data.guildId, presence),
        );
      }
      return { status: "success", players };
    } catch (cause) {
      // Gateway command-handler maps OrganizationAccessDenied to this exact wire response.
      // Transport failures must remain failures so presence callers can retry them.
      if (
        cause instanceof RealtimeRequestError &&
        cause.code === "COMMAND_REJECTED" &&
        cause.message === "organization access denied"
      )
        return { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" };
      throw cause;
    }
  }

  private requestLegacy<Event extends GatewayEvent>(
    event: Event,
    payload?: SocketPayload<Event>,
  ): Promise<SocketResponse<Event>>;
  private async requestLegacy(
    ...[event, payload]: SocketRequest
  ): Promise<SocketResponse<GatewayEvent>> {
    if (event === GatewayEvent.ONLINE_PLAYERS_PRESENCE_FETCH) {
      if (!payload) throw new Error("Missing presence.fetch payload");
      return this.fetchPresence(payload);
    }
    if (event === GatewayEvent.MAP_PING_SEND) {
      if (!payload) throw new Error("Missing map-ping.send payload");
      const response = await this.realtime.request("map-ping.send", payload);
      if (!isMapPingAcknowledgement(response))
        throw new Error("Invalid map-ping.send response");
      return response;
    }
    if (event === GatewayEvent.AIR_TAG_SUBSCRIPTION) {
      if (!payload) throw new Error("Missing air-tag.subscription payload");
      const data = payload;
      const response = await this.realtime.request("air-tag.subscription", {
        requestId: data.requestId,
        enabled: data.enabled,
        expectedMapId: data.expectedMapId,
      });
      if (!isAirTagSubscriptionAcknowledgement(response))
        throw new Error("Invalid air-tag.subscription response");
      return response;
    }
    if (event === GatewayEvent.AIR_TAG_OBSERVATION) {
      if (!payload) throw new Error("Missing air-tag.observation payload");
      const response = await this.realtime.request(
        "air-tag.observation",
        payload,
      );
      if (!isAirTagObservationAcknowledgement(response))
        throw new Error("Invalid air-tag.observation response");
      return response;
    }
    return undefined;
  }

  private handleServerEvent(event: ServerEvent): void {
    if (event.type === "session.joined") {
      this.id = event.data.connectionId;
      this.joinedOrganizationIds = [...event.data.organizationIds];
      if (event.data.accessPolicy)
        this.applyAccessPolicy(event.data.accessPolicy);
      return;
    }
    if (event.type === "permissions.updated") {
      const addedOrganization = event.data.organizationIds.some(
        (id) => !this.joinedOrganizationIds.includes(id),
      );
      this.joinedOrganizationIds = [...event.data.organizationIds];
      if (event.data.accessPolicy) {
        this.applyAccessPolicy(event.data.accessPolicy);
        if (addedOrganization) void this.publishPresence();
      } else {
        this.currentAccessPolicy = undefined;
        this.listeners.emit(GatewayEvent.PERMISSIONS_UPDATED, {
          guilds: event.data.organizationIds.map((id) => ({ guild: { id } })),
          featureRooms: event.data.subscriptionScopes.map(
            (scope) => scope.topic,
          ),
        });
        void this.publishPresence();
      }
      return;
    }
    if (event.type === "presence.snapshot") {
      for (const presence of event.data.presences) {
        this.listeners.emit(
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
                discordId: change.discordId ?? change.userId,
                guildId: event.data.organizationId,
                sessionId: change.sessionId,
                status: "offline",
              };
        this.listeners.emit(
          GatewayEvent.ONLINE_PLAYERS_PRESENCE_UPDATE,
          payload,
        );
      }
      return;
    }
    const legacyEvent = legacyEventNames[event.type];
    if (legacyEvent) {
      const payload =
        event.type === "map-ping.received" || event.type === "air-tag.updated"
          ? event.data
          : unwrapOrganizationEvent(event);
      this.listeners.emit(legacyEvent, payload);
    }
  }

  private applyAccessPolicy(policy: AccessPolicySnapshot): void {
    const previous = this.currentAccessPolicy;
    if (previous?.version === policy.version) return;
    const changes = diffAccessPolicies(
      previous ?? createAccessPolicySnapshot([], ""),
      policy,
    );
    this.currentAccessPolicy = policy;
    this.listeners.emit(GatewayEvent.PERMISSIONS_UPDATED, {
      guilds: policy.organizations.map(({ organizationId }) => ({
        guild: { id: organizationId },
      })),
      accessPolicy: policy,
      changes,
    } satisfies PermissionsUpdatedPayload);
  }

  private dispatchJoin(result: JoinResult): void {
    if (!result.accessPolicy) {
      this.currentAccessPolicy = undefined;
      this.listeners.emit(GatewayEvent.PERMISSIONS_UPDATED, {
        guilds: result.organizationIds.map((id) => ({ guild: { id } })),
      } satisfies PermissionsUpdatedPayload);
    }
    this.listeners.emit(GatewayEvent.JOIN, {
      status: "success",
      guildsCount: result.organizationIds.length,
      guildIds: [...result.organizationIds],
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
  activeSocket.dispose();
};
