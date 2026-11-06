import type { AirTagMapThreatEvent } from "@lootlog/schema/air-tag";
import type {
  NpcPresenceReport,
  NpcPresenceReportAck,
  NpcPresenceSnapshot,
} from "@lootlog/schema/npc-presence";
import type { CommandSuccess, SessionJoined } from "@lootlog/protocol/realtime";
import {
  toOfflinePlayerPresence,
  toPlayerPresence,
  toPlayerPresenceResponse,
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
  RealtimeRequestError,
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

type Listener = (...arguments_: never[]) => void;

/** A new access policy and what changed against the previous one. */
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

/** How long a join waits for `session.hello` before it fails into a retry. */
const SESSION_HELLO_TIMEOUT_MS = 5_000;

/** Events whose data carries no Organization envelope to unwrap. */
const UNWRAPPED_EVENT_TYPES: ReadonlySet<ServerEvent["type"]> = new Set([
  "map-ping.received",
  "battle-ping.received",
  "loot-split.received",
  "loot-split.auto-accepted",
  "air-tag.map-threat-updated",
  "npc-presence.updated",
]);

/** Server events delivered to listeners under their protocol type. */
const FORWARDED_EVENT_TYPES = [
  "chat.created",
  "chat.updated",
  "chat.deleted",
  "chat.cleared",
  "timer.created",
  "timer.deleted",
  "hero-sighting.updated",
  "notification.sent",
  "notification.going",
  "notification.volunteer",
  "member-refresh.updated",
  "party-gathering.state-updated",
  "party-gathering.updated",
  "party-gathering.cancelled",
  "party-ready-room.updated",
  "map-ping.received",
  "battle-ping.received",
  "loot-split.received",
  "loot-split.auto-accepted",
  "air-tag.scope-updated",
  "air-tag.map-threat-updated",
  "npc-presence.updated",
  "global-chat.created",
  "global-chat.deleted",
  "global-chat.pinned",
  "global-chat.stats",
  "event.map-status-updated",
  "event.hero-killed",
  "event.ranking-updated",
] as const satisfies ReadonlyArray<ServerEvent["type"]>;

type ForwardedEventType = (typeof FORWARDED_EVENT_TYPES)[number];

const forwardedEventTypes: ReadonlySet<string> = new Set(FORWARDED_EVENT_TYPES);

const isForwardedEventType = (type: string): type is ForwardedEventType =>
  forwardedEventTypes.has(type);

/**
 * What AppSocket listeners hear: forwarded server events, and the events of
 * the connection itself:
 * - `connect` and `disconnect` follow the transport;
 * - `join` carries a {@link JoinResult} once the character's session joined;
 * - `access.updated` carries an {@link AccessUpdate};
 * - `global-chat.subscribed` carries the channel once its subscription is live;
 * - `presence.published` follows an accepted presence publication;
 * - `presence.changed` carries one online player's `PlayerPresence` change.
 */
export type AppSocketEvent =
  | ForwardedEventType
  | "connect"
  | "disconnect"
  | "join"
  | "access.updated"
  | "global-chat.subscribed"
  | "presence.published"
  | "presence.changed";

export class AppSocket {
  private readonly realtime = getGameClientPlatform().createRealtime();
  private readonly listeners = new RealtimeEventListeners<AppSocketEvent>();
  private readonly unsubscribeEvents: () => void;
  private readonly unsubscribeState: () => void;
  private disposed = false;
  private joinedOrganizationIds: string[] = [];
  /** The current character's Lootlogs; nothing is published until they are known. */
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
  /** The followed global chat channel, if any; every join drops the subscription. */
  private globalChatChannel: GlobalChatChannel | undefined;
  id: string | undefined;

  constructor() {
    // SocketProvider owns every join with the current character and a fresh proof.
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

      this.listeners.emit(connected ? "connect" : "disconnect");
    });
  }

  get connected(): boolean {
    return this.wasConnected;
  }

  /** The transport's own reading, which tells a first connect from a retry. */
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

  /** Current map threats of one Organization and world. */
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

  /** Replaces the timer NPCs this character reports standing on its map. */
  reportNpcPresence(report: NpcPresenceReport): Promise<NpcPresenceReportAck> {
    return this.realtime.request("npc-presence.report", report);
  }

  /** NPCs standing in one Organization and world. */
  fetchNpcPresence(
    organizationId: string,
    world: string,
  ): Promise<NpcPresenceSnapshot> {
    return this.realtime.request("npc-presence.fetch", {
      organizationId,
      world,
    });
  }

  /**
   * Follows one global chat channel, or none when `undefined`. The
   * subscription is renewed after every join and emits
   * `global-chat.subscribed` with the channel once live, so its reader can
   * fetch what it missed while not subscribed.
   */
  followGlobalChat(channel: GlobalChatChannel | undefined): void {
    const previous = this.globalChatChannel;

    if (previous === channel) return;
    this.globalChatChannel = channel;

    // Until a join, the next join renews the subscription.
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
      // The next join renews it; until then the reader keeps fetched history.
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

  on(event: AppSocketEvent, listener: Listener): this {
    this.listeners.add(event, listener);

    return this;
  }

  off(event: AppSocketEvent, listener: Listener): this {
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

    // A gateway that never says hello must fail the join, so the player gets
    // HTTP snapshots and a retry instead of a silent half-connected session.
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
    });

    ensureCurrent();

    // Undefined when the connection closed before the join was sent.
    if (!response) throw new Error("Invalid session.join response");
    this.id = response.connectionId;

    this.joinedOrganizationIds = [...response.organizationIds];

    this.applyAccessPolicy(response.accessPolicy);

    // The gateway grants presence only where this character publishes and
    // runs one connection's commands in order, so the publication sent here
    // settles before anything joined starts reading presence.
    void this.publishPresence();

    this.dispatchJoin(response, data);

    const channel = this.globalChatChannel;

    if (channel !== undefined)
      void this.requestGlobalChatSubscription(channel, true);

    return response;
  }

  /** Sends one command; `timeoutMs` bounds the wait for its response. */
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

  /**
   * Follows the catching scope of the current character; `undefined` while it
   * is unknown, so a scope of another account or character is never published.
   */
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
      organizationIds.every((id) => current.includes(id))
    )
      return;
    this.presenceOrganizationIds = [...organizationIds];

    if (this.id && this.connectionState === "ready")
      void this.publishPresence();
  }

  /** Publishes the character, map and stasis as they are now. */
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
      // The gateway opens a Lootlog's presence once this character is
      // visible there, and announces that before it answers.
      this.listeners.emit("presence.published", { organizationIds });
    } catch {
      // Presence is best effort; the next publication carries the current state.
      if (import.meta.env.DEV)
        console.warn("[Gateway] Failed to publish presence");
    }
  }

  /** One Lootlog's online game characters in one world. */
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

    if (isForwardedEventType(event.type))
      this.listeners.emit(
        event.type,
        UNWRAPPED_EVENT_TYPES.has(event.type) ||
          event.type.startsWith("global-chat.")
          ? event.data
          : unwrapOrganizationEvent(event),
      );
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

/** Publishes the projected presence once the gateway has joined a Lootlog. */
export const publishPlayerPresence = (): void => {
  const { connected, joinedGuilds } = useGlobalStore.getState().socketState;

  if (connected && joinedGuilds.length > 0) void getSocket().publishPresence();
};
