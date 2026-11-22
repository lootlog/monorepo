import type { AirTagMapThreatEvent } from "@lootlog/schema/air-tag";
import { difference } from "es-toolkit";
import type {
  NpcPresenceReport,
  NpcPresenceReportAck,
  NpcPresenceSnapshot,
} from "@lootlog/schema/npc-presence";
import {
  CHARACTER_AURAS_FEATURE,
  type CommandSuccess,
  type ServerEventPayload,
  type SessionJoined,
} from "@lootlog/protocol/realtime";
import {
  toOfflinePlayerPresence,
  toPlayerPresence,
  toPlayerPresenceResponse,
  type PlayerPresence,
  type PlayerPresenceAck,
} from "@/lib/online-players-presence";
import {
  RealtimeEventListeners,
  unwrapOrganizationEvent,
} from "@lootlog/client/realtime/event-listeners";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import {
  GLOBAL_CHAT_SHARED_CHANNEL,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import {
  isOrganizationAccessDenied,
  type CommandData,
  type CommandType,
  type RealtimeConnectionState,
  type ServerEvent,
} from "@lootlog/client/realtime";
import { requestMargonemAccountProof } from "@/lib/margonem-account-proof";
import { getGameClientPlatform } from "@/lib/game-client-platform";

import {
  createAccessPolicySnapshot,
  diffAccessPolicies,
  type AccessPolicySnapshot,
  type AccessPolicyChange,
} from "@lootlog/protocol/realtime/access-policy";

export type AccessUpdate = {
  readonly accessPolicy: AccessPolicySnapshot;
  readonly changes: readonly AccessPolicyChange[];
};

export type JoinResult = {
  readonly characterIdentity: string;
  readonly guildIds: readonly string[];
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

export const getGameSessionIdentity = (
  data: Pick<GameSessionJoinData, "world" | "accountId" | "characterId"> & {
    readonly clan?: { readonly id: number };
  },
): string =>
  JSON.stringify([data.world, data.accountId, data.characterId, data.clan?.id]);

const SESSION_HELLO_TIMEOUT_MS = 5_000;

type ConsumedEventType =
  | "session.hello"
  | "session.joined"
  | "permissions.updated"
  | "presence.delta";

export type AppSocketEvents = {
  readonly [
    Type in Exclude<ServerEvent["type"], ConsumedEventType>
  ]: ServerEventPayload<Type>;
} & {
  readonly connect: undefined;
  readonly disconnect: undefined;
  readonly join: JoinResult;
  readonly "access.updated": AccessUpdate;
  readonly "global-chat.subscribed": GlobalChatChannel;
  readonly "presence.published": {
    readonly organizationIds: readonly string[];
  };
  readonly "presence.changed": PlayerPresence;
};

export type AppSocketEvent = keyof AppSocketEvents;

type AppSocketListener<Event extends AppSocketEvent> = (
  payload: AppSocketEvents[Event],
) => void;

export class AppSocket {
  private readonly realtime = getGameClientPlatform().createRealtime();
  private readonly listeners = new RealtimeEventListeners<AppSocketEvents>();
  private readonly unsubscribeEvents: () => void;
  private readonly unsubscribeState: () => void;
  private disposed = false;
  private joinedOrganizationIds: string[] = [];
  private presenceOrganizationIds: readonly string[] | undefined;
  private currentAccessPolicy: AccessPolicySnapshot | undefined;
  private wasConnected = false;
  private connectionStateValue: RealtimeConnectionState = "disconnected";
  private readonly connectionStateListeners = new Set<() => void>();
  private lastJoinData: GameSessionJoinData | null = null;
  private connectionGeneration = 0;
  private joinRevision = 0;
  private hello = Promise.withResolvers<string | undefined>();
  private joinAttempt: {
    key: string;
    promise: Promise<SessionJoined>;
    cancel: () => void;
  } | null = null;
  private globalChatChannel: GlobalChatChannel | undefined;
  id: string | undefined;

  constructor() {
    this.realtime.setReconnectHandler(async () => {});
    this.unsubscribeEvents = this.realtime.subscribe((event) =>
      this.handleServerEvent(event),
    );
    this.unsubscribeState = this.realtime.subscribeState((state) => {
      this.connectionStateValue = state;

      for (const listener of this.connectionStateListeners) listener();

      const connected =
        state === "connected" || state === "joining" || state === "ready";

      if (connected === this.wasConnected) return;
      this.wasConnected = connected;

      if (state === "disconnected") {
        this.id = undefined;
        this.connectionGeneration += 1;
        this.hello.resolve(undefined);
        this.hello = Promise.withResolvers<string | undefined>();
        this.joinAttempt?.cancel();
        this.joinAttempt = null;
        this.joinedOrganizationIds = [];
      }

      this.listeners.emit(connected ? "connect" : "disconnect", undefined);
    });
  }

  get connected(): boolean {
    return this.wasConnected;
  }

  get connectionState(): RealtimeConnectionState {
    return this.connectionStateValue;
  }

  subscribeConnectionState(listener: () => void): () => void {
    this.connectionStateListeners.add(listener);

    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  subscribeHeartbeatLatency(
    listener: (latencyMs: number | null) => void,
  ): () => void {
    return this.realtime.subscribeHeartbeatLatency(listener);
  }

  probeLatency(): void {
    this.realtime.probeLatency();
  }

  async fetchAirTagMapThreats(
    organizationId: string,
    world: string,
  ): Promise<readonly AirTagMapThreatEvent[]> {
    const response = await this.realtime.request("air-tag.map-threats.fetch", {
      organizationId,
      world,
    });

    return response.threats;
  }

  reportNpcPresence(report: NpcPresenceReport): Promise<NpcPresenceReportAck> {
    return this.realtime.request("npc-presence.report", report);
  }

  fetchNpcPresence(
    organizationId: string,
    world: string,
  ): Promise<NpcPresenceSnapshot> {
    return this.realtime.request("npc-presence.fetch", {
      organizationId,
      world,
    });
  }

  followGlobalChat(channel: GlobalChatChannel | undefined): void {
    const previous = this.globalChatChannel;

    if (previous === channel) return;
    this.globalChatChannel = channel;

    if (this.connectionState !== "ready") return;

    if (previous !== undefined)
      void this.requestGlobalChatSubscription(previous, false);

    if (channel !== undefined)
      void this.requestGlobalChatSubscription(channel, true);
  }

  private async requestGlobalChatSubscription(
    channel: GlobalChatChannel,
    subscribed: boolean,
  ): Promise<void> {
    try {
      await this.realtime.request(
        subscribed ? "subscription.subscribe" : "subscription.unsubscribe",
        channel === GLOBAL_CHAT_SHARED_CHANNEL
          ? { topic: "global.chat" }
          : { topic: "global.chat.world", world: channel },
      );

      if (subscribed && this.globalChatChannel === channel)
        this.listeners.emit("global-chat.subscribed", channel);
    } catch {
      if (import.meta.env.DEV)
        console.warn("[Gateway] Failed to update the global chat subscription");
    }
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
      this.connectionStateListeners.clear();
      this.realtime.setReconnectHandler(null);
      this.removeAllListeners();
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  hasListeners(event: AppSocketEvent): boolean {
    return this.listeners.has(event);
  }

  on<Event extends AppSocketEvent>(
    event: Event,
    listener: AppSocketListener<Event>,
  ): this {
    this.listeners.add(event, listener);

    return this;
  }

  off<Event extends AppSocketEvent>(
    event: Event,
    listener: AppSocketListener<Event>,
  ): this {
    this.listeners.delete(event, listener);

    return this;
  }

  join(data: GameSessionJoinData): Promise<SessionJoined> {
    const key = JSON.stringify(data);

    if (this.joinAttempt?.key === key) return this.joinAttempt.promise;

    if (this.lastJoinData && this.lastJoinData.accountId !== data.accountId)
      this.currentAccessPolicy = undefined;

    this.lastJoinData = data;
    this.joinAttempt?.cancel();
    const controller = new AbortController();
    const revision = ++this.joinRevision;

    const promise = this.joinSession(
      data,
      this.connectionGeneration,
      revision,
      controller.signal,
    );

    this.joinAttempt = { key, promise, cancel: () => controller.abort() };
    void promise.catch(() => {
      if (this.joinAttempt?.promise === promise) this.joinAttempt = null;
    });

    return promise;
  }

  private async joinSession(
    data: GameSessionJoinData,
    generation: number,
    revision: number,
    signal: AbortSignal,
  ): Promise<SessionJoined> {
    const ensureCurrent = () => {
      if (
        this.disposed ||
        !this.connected ||
        this.connectionGeneration !== generation ||
        this.joinRevision !== revision
      )
        throw new Error("Realtime session changed before join completed");
    };

    ensureCurrent();
    let helloTimeout: ReturnType<typeof setTimeout> | undefined;

    const connectionId = await Promise.race([
      this.hello.promise,
      new Promise<never>((_resolve, reject) => {
        helloTimeout = setTimeout(
          () => reject(new Error("Realtime session hello timeout")),
          SESSION_HELLO_TIMEOUT_MS,
        );
      }),
    ]).finally(() => clearTimeout(helloTimeout));

    ensureCurrent();

    if (!connectionId)
      throw new Error("Realtime session changed before join completed");

    const proofController = new AbortController();
    const proofTimeout = setTimeout(() => proofController.abort(), 5_000);

    const margonemAccountProof = await requestMargonemAccountProof({
      socketId: connectionId,
      accountId: data.accountId,
      characterId: data.characterId,
      clanId: data.clan?.id,
      signal: AbortSignal.any([signal, proofController.signal]),
    })
      .catch(() => undefined)
      .finally(() => clearTimeout(proofTimeout));

    ensureCurrent();

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
      features: [CHARACTER_AURAS_FEATURE],
    });

    ensureCurrent();

    if (!response) throw new Error("Invalid session.join response");
    this.id = response.connectionId;

    this.joinedOrganizationIds = [...response.organizationIds];

    this.applyAccessPolicy(response.accessPolicy);

    void this.publishPresence();

    this.dispatchJoin(response, data);

    const channel = this.globalChatChannel;

    if (channel !== undefined)
      void this.requestGlobalChatSubscription(channel, true);

    return response;
  }

  request<Type extends CommandType>(
    type: Type,
    data: CommandData<Type>,
    timeoutMs?: number,
  ): Promise<CommandSuccess<Type>> {
    const response = this.realtime.request(type, data);

    if (timeoutMs === undefined) return response;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    return Promise.race([
      response,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Realtime acknowledgement timeout")),
          timeoutMs,
        );
      }),
    ]).finally(() => clearTimeout(timeout));
  }

  setPresenceOrganizations(
    organizationIds: readonly string[] | undefined,
  ): void {
    const current = this.presenceOrganizationIds;

    if (!organizationIds) {
      this.presenceOrganizationIds = undefined;

      return;
    }

    if (
      current?.length === organizationIds.length &&
      difference(organizationIds, current).length === 0
    )
      return;
    this.presenceOrganizationIds = [...organizationIds];

    if (this.id && this.connectionState === "ready")
      void this.publishPresence();
  }

  async publishPresence(): Promise<void> {
    const game = useGameStore.getState().game;
    const organizationIds = this.presenceOrganizationIds;

    if (!game || !organizationIds) return;

    try {
      await this.realtime.request("presence.publish", {
        organizationIds: [...organizationIds],
        isAfk: game.hero.stasis,
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
      this.listeners.emit("presence.published", { organizationIds });
    } catch {
      if (import.meta.env.DEV)
        console.warn("[Gateway] Failed to publish presence");
    }
  }

  async fetchPresence(
    organizationId: string,
    world: string,
    timeoutMs: number,
  ): Promise<PlayerPresenceAck> {
    try {
      const response = await this.request(
        "presence.fetch",
        { organizationId, world, delivery: "response" },
        timeoutMs,
      );

      return {
        status: "success",
        players: toPlayerPresenceResponse(organizationId, response.presences),
      };
    } catch (cause) {
      if (isOrganizationAccessDenied(cause))
        return { status: "forbidden", code: "ONLINE_PLAYERS_ACCESS_DENIED" };
      throw cause;
    }
  }

  private handleServerEvent(event: ServerEvent): void {
    if (event.type === "session.hello") {
      this.id = event.data.connectionId;
      this.hello.resolve(event.data.connectionId);

      return;
    }

    if (event.type === "session.joined") {
      this.id = event.data.connectionId;
      this.joinedOrganizationIds = [...event.data.organizationIds];
      this.applyAccessPolicy(event.data.accessPolicy);

      return;
    }

    if (event.type === "permissions.updated") {
      const joinedOrganizations = new Set(this.joinedOrganizationIds);

      const addedOrganization = event.data.organizationIds.some(
        (id) => !joinedOrganizations.has(id),
      );

      this.joinedOrganizationIds = [...event.data.organizationIds];
      this.applyAccessPolicy(event.data.accessPolicy);

      if (addedOrganization) void this.publishPresence();

      return;
    }

    if (event.type === "presence.delta") {
      const { organizationId } = event.data;

      for (const change of event.data.changes)
        this.listeners.emit(
          "presence.changed",
          change.action === "upsert"
            ? toPlayerPresence(organizationId, change.presence)
            : toOfflinePlayerPresence(organizationId, change),
        );

      return;
    }

    this.listeners.emit(event.type, unwrapOrganizationEvent(event));
  }

  private applyAccessPolicy(policy: AccessPolicySnapshot): void {
    const previous = this.currentAccessPolicy;

    if (previous?.version === policy.version) return;

    const changes = diffAccessPolicies(
      previous ?? createAccessPolicySnapshot([], ""),
      policy,
    );

    this.currentAccessPolicy = policy;
    this.listeners.emit("access.updated", {
      accessPolicy: policy,
      changes,
    } satisfies AccessUpdate);
  }

  private dispatchJoin(result: SessionJoined, data: GameSessionJoinData): void {
    this.listeners.emit("join", {
      characterIdentity: getGameSessionIdentity(data),
      guildIds: [...result.organizationIds],
    } satisfies JoinResult);
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

export const publishPlayerPresence = (): void => {
  const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

  if (connected && joinedGuilds.length > 0) void getSocket().publishPresence();
};
