import { canReadApiKeyEvent } from "#src/realtime/api-key-event-visibility";
import type { LootVisibilityNpc } from "@lootlog/domain/loot-visibility";
import {
  chatMessagePermissions,
  withChatMessagePermissions,
} from "#src/realtime/chat-message-envelope";
import { canReadSourceEvent } from "#src/realtime/source-event-visibility";
import {
  encodeRealtimeFrame,
  tryDecodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import {
  type Response as RealtimeResponse,
  type ServerEvent,
  isServerEventFrame,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Effect, Schema } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import {
  type BackgroundTaskRunner,
  unmanagedBackgroundTaskRunner,
} from "#src/platform/background-tasks";
import { Logger } from "#src/platform/logger";
import type {
  FederatedRealtimeMessage,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import {
  hasValidApiKeyLease,
  type GatewaySocket,
  type SessionData,
} from "#src/realtime/session";
import { canReadPreciseLocation } from "#src/realtime/subscription-policy";
import { SubscriptionLimitExceeded } from "#src/realtime/realtime-errors";

type Scope = typeof SubscriptionScope.Type;
type Event = typeof ServerEvent.Type;
type Response = typeof RealtimeResponse.Type;

// ponytail: replay deduplication covers 10,000 events per live instance; use a durable inbox if retries must survive eviction or restarts.
const MAX_DEDUPLICATION_ENTRIES = 10_000;
const MAX_SUBSCRIPTIONS = 4_096;
const MAX_SCOPE_BYTES = 1_024;
const ConnectionRegistration = Schema.Struct({
  connectionId: Schema.String,
  instanceId: Schema.String,
  userId: Schema.String,
  discordId: Schema.String,
});
const decodeConnectionRegistration = Schema.decodeUnknownSync(
  Schema.fromJsonString(ConnectionRegistration),
);

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");
const fromBase64 = (value: string): Uint8Array => Buffer.from(value, "base64");

export const getScopeKey = (scope: Scope): string =>
  [
    scope.topic,
    scope.organizationId ?? "",
    scope.eventId ?? "",
    scope.world ?? "",
    scope.mapId?.toString() ?? "",
  ].join("|");

const getScopeAudienceKey = (scope: Scope): string =>
  JSON.stringify([
    scope.topic,
    scope.organizationId,
    scope.eventId,
    scope.world,
    scope.mapId,
  ]);

// Four optional fields produce at most 16 exact/wildcard subscription keys.
const matchingScopeAudienceKeys = (scope: Scope): string[] => {
  let keys: Array<Array<string | number | undefined>> = [[scope.topic]];
  for (const value of [
    scope.organizationId,
    scope.eventId,
    scope.world,
    scope.mapId,
  ]) {
    keys = keys.flatMap((key) =>
      value === undefined
        ? [[...key, undefined]]
        : [
            [...key, undefined],
            [...key, value],
          ],
    );
  }
  return keys.map((key) => JSON.stringify(key));
};

type RealtimeFederationStore = Pick<
  RedisGatewayStore,
  "publish" | "subscribe"
> & {
  command: Pick<
    RedisGatewayStore["command"],
    "set" | "del" | "sadd" | "srem" | "expire" | "smembers" | "mget"
  >;
};

export class RealtimeHub {
  private readonly logger = new Logger(RealtimeHub.name);
  private readonly sockets = new Map<string, GatewaySocket>();
  private readonly audiences = new Map<string, Set<GatewaySocket>>();
  private readonly seenEventIds = new Set<string>();
  private readonly seenEventOrder: string[] = [];
  private readonly permissionRebalanceListeners = new Set<
    (discordId: string, userId: string) => Effect.Effect<void, unknown>
  >();
  readonly instanceId = crypto.randomUUID();

  constructor(
    private readonly config: Pick<
      GatewayConfiguration,
      "maxBackpressureBytes" | "maxBackpressureStrikes"
    >,
    private readonly redis: RealtimeFederationStore,
    private readonly runBackground: BackgroundTaskRunner = unmanagedBackgroundTaskRunner,
  ) {}

  start(): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () =>
        this.redis.subscribe((message) => this.receiveFederated(message)),
      catch: (cause) => cause,
    });
  }

  register(socket: GatewaySocket): void {
    const previous = this.sockets.get(socket.data.connectionId);
    if (previous) {
      for (const key of this.audienceKeys(previous.data))
        this.removeAudience(key, previous);
    }
    this.sockets.set(socket.data.connectionId, socket);
    for (const key of this.audienceKeys(socket.data))
      this.addAudience(key, socket);
    this.runBackground(
      "registry.register",
      Effect.tryPromise({
        try: () => this.refreshRegistry(socket.data),
        catch: (cause) => cause,
      }),
    );
  }

  unregister(socket: GatewaySocket): void {
    if (this.sockets.get(socket.data.connectionId) !== socket) return;
    this.sockets.delete(socket.data.connectionId);
    for (const key of this.audienceKeys(socket.data))
      this.removeAudience(key, socket);
    this.runBackground(
      "registry.unregister",
      Effect.tryPromise({
        try: () =>
          Promise.all([
            this.redis.command.del(
              this.connectionKey(socket.data.connectionId),
            ),
            this.redis.command.srem(
              this.userConnectionsKey(socket.data.userId),
              socket.data.connectionId,
            ),
          ]).then(() => undefined),
        catch: (cause) => cause,
      }),
    );
  }

  subscribe(socket: GatewaySocket, scope: Scope): void {
    const key = getScopeKey(scope);
    const previous = socket.data.subscriptions.get(key);
    if (
      (!previous && socket.data.subscriptions.size >= MAX_SUBSCRIPTIONS) ||
      Buffer.byteLength(JSON.stringify(scope)) > MAX_SCOPE_BYTES
    )
      throw new SubscriptionLimitExceeded();
    if (previous) this.unsubscribe(socket, previous);
    socket.data.subscriptions.set(key, scope);
    if (this.sockets.get(socket.data.connectionId) === socket)
      this.addAudience(getScopeAudienceKey(scope), socket);
  }

  unsubscribe(socket: GatewaySocket, scope: Scope): void {
    const key = getScopeKey(scope);
    const removed = socket.data.subscriptions.get(key);
    if (!removed) return;
    socket.data.subscriptions.delete(key);
    for (const subscription of socket.data.subscriptions.values()) {
      if (getScopeAudienceKey(subscription) === getScopeAudienceKey(removed))
        return;
    }
    this.removeAudience(getScopeAudienceKey(removed), socket);
  }

  replaceSubscriptions(
    socket: GatewaySocket,
    scopes: ReadonlyArray<Scope>,
  ): void {
    const replacements = new Map(
      scopes.map((scope) => [getScopeKey(scope), scope]),
    );
    if (
      replacements.size > MAX_SUBSCRIPTIONS ||
      scopes.some(
        (scope) => Buffer.byteLength(JSON.stringify(scope)) > MAX_SCOPE_BYTES,
      )
    ) {
      // Reconciliation must never retain subscriptions revoked by a permission change.
      for (const scope of socket.data.subscriptions.values())
        this.removeAudience(getScopeAudienceKey(scope), socket);
      socket.data.subscriptions.clear();
      socket.close(1008, "subscription limit exceeded");
      throw new SubscriptionLimitExceeded();
    }
    for (const scope of socket.data.subscriptions.values())
      this.removeAudience(getScopeAudienceKey(scope), socket);
    socket.data.subscriptions.clear();
    for (const scope of replacements.values()) this.subscribe(socket, scope);
  }

  async refreshRegistry(session: SessionData): Promise<void> {
    const userConnectionsKey = this.userConnectionsKey(session.userId);
    await Promise.all([
      this.redis.command.set(
        this.connectionKey(session.connectionId),
        JSON.stringify({
          connectionId: session.connectionId,
          instanceId: this.instanceId,
          userId: session.userId,
          discordId: session.discordId,
        }),
        "EX",
        60,
      ),
      this.redis.command.sadd(userConnectionsKey, session.connectionId),
      this.redis.command.expire(userConnectionsKey, 120),
    ]);
  }

  async lookupUserConnections(userId: string): Promise<
    ReadonlyArray<{
      readonly connectionId: string;
      readonly instanceId: string;
      readonly userId: string;
      readonly discordId: string;
    }>
  > {
    const connectionIds = await this.redis.command.smembers(
      this.userConnectionsKey(userId),
    );
    if (connectionIds.length === 0) return [];
    const values = await this.redis.command.mget(
      connectionIds.map((id) => this.connectionKey(id)),
    );
    return values.flatMap((value) => {
      if (!value) return [];
      try {
        return [decodeConnectionRegistration(value)];
      } catch {
        return [];
      }
    });
  }

  sendResponse(socket: GatewaySocket, response: Response): boolean {
    return this.sendFrame(socket, response);
  }

  sendEvent(socket: GatewaySocket, event: Event): boolean {
    if (!canReadApiKeyEvent(socket.data, event)) return false;
    return this.sendFrame(socket, event);
  }

  async publishToScope(
    scope: Scope,
    event: Event,
    publicationId?: string,
    options: {
      readonly recipientPlatform?: "web-app";
      readonly sourceNpcs?: ReadonlyArray<LootVisibilityNpc>;
    } = {},
  ): Promise<void> {
    const { message, bytes } = this.createFederatedMessage({
      id: publicationId
        ? JSON.stringify([getScopeKey(scope), event.type, publicationId])
        : undefined,
      ...options,
      scopeKey: getScopeKey(scope),
      scope,
      frame: event,
    });
    this.deliver(message, bytes);
    // Retry federation even when this instance already delivered the publication.
    await this.redis.publish(message);
  }

  async publishToScopes(
    scopes: ReadonlyArray<Scope>,
    event: Event,
    options: {
      readonly excludeConnectionId?: string;
      readonly recipientPlatform?: "game" | "web-app";
      readonly recipientWorld?: string;
      readonly recipientMapId?: number;
    } = {},
  ): Promise<void> {
    if (scopes.length === 0) return;
    const { message, bytes } = this.createFederatedMessage({
      scopes,
      frame: event,
      ...options,
    });
    this.deliver(message, bytes);
    await this.redis.publish(message);
  }

  async publishToUser(userId: string, event: Event): Promise<void> {
    const { message, bytes } = this.createFederatedMessage({
      userId,
      frame: event,
    });
    this.deliver(message, bytes);
    await this.redis.publish(message);
  }

  async publishToDiscord(discordId: string, event: Event): Promise<void> {
    const { message, bytes } = this.createFederatedMessage({
      discordId,
      frame: event,
    });
    this.deliver(message, bytes);
    await this.redis.publish(message);
  }

  onPermissionRebalance(
    listener: (
      discordId: string,
      userId: string,
    ) => Effect.Effect<void, unknown>,
  ): void {
    this.permissionRebalanceListeners.add(listener);
  }

  publishPermissionRebalance(
    discordId: string,
    userId: string,
  ): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () =>
        this.redis.publish({
          id: crypto.randomUUID(),
          sourceInstanceId: this.instanceId,
          control: { type: "permissions.rebalance", discordId, userId },
        }),
      catch: (cause) => cause,
    });
  }

  async publishPresence(
    scope: Scope,
    basicEvent: Event,
    preciseEvent: Event,
  ): Promise<void> {
    const organizationId = scope.organizationId;
    if (!organizationId) return;
    const scopeKey = getScopeKey(scope);
    const messages = [
      this.createFederatedMessage({
        scopeKey,
        scope,
        organizationId,
        presenceAudience: "basic",
        frame: basicEvent,
      }),
      this.createFederatedMessage({
        scopeKey,
        scope,
        organizationId,
        presenceAudience: "precise",
        frame: preciseEvent,
      }),
    ];
    for (const { message, bytes } of messages) {
      this.deliver(message, bytes);
      await this.redis.publish(message);
    }
  }

  getLocalSockets(): ReadonlyArray<GatewaySocket> {
    return [...this.sockets.values()];
  }

  getLocalSocketsForUser(userId: string): ReadonlyArray<GatewaySocket> {
    return [...(this.audiences.get(JSON.stringify(["user", userId])) ?? [])];
  }

  private connectionKey(connectionId: string): string {
    return `realtime:connection:${connectionId}`;
  }

  private userConnectionsKey(userId: string): string {
    return `realtime:user:${userId}:connections`;
  }

  private createFederatedMessage(options: {
    readonly sourceNpcs?: ReadonlyArray<LootVisibilityNpc>;
    readonly id?: string;
    readonly scopeKey?: string;
    readonly scope?: Scope;
    readonly scopes?: ReadonlyArray<Scope>;
    readonly userId?: string;
    readonly discordId?: string;
    readonly excludeConnectionId?: string;
    readonly recipientPlatform?: "game" | "web-app";
    readonly recipientWorld?: string;
    readonly recipientMapId?: number;
    readonly organizationId?: string;
    readonly presenceAudience?: "basic" | "precise";
    readonly frame: Event;
  }) {
    const bytes = encodeRealtimeFrame(options.frame);
    return {
      bytes,
      message: {
        id: options.id ?? crypto.randomUUID(),
        sourceInstanceId: this.instanceId,
        sourceNpcs: options.sourceNpcs,
        scopeKey: options.scopeKey,
        scope: options.scope,
        scopes: options.scopes,
        userId: options.userId,
        discordId: options.discordId,
        excludeConnectionId: options.excludeConnectionId,
        recipientPlatform: options.recipientPlatform,
        recipientWorld: options.recipientWorld,
        recipientMapId: options.recipientMapId,
        organizationId: options.organizationId,
        presenceAudience: options.presenceAudience,
        frame: toBase64(bytes),
      },
    };
  }

  private receiveFederated(message: FederatedRealtimeMessage): void {
    if (message.sourceInstanceId === this.instanceId) return;
    if (message.control) {
      if (!this.remember(message.id)) return;
      for (const listener of this.permissionRebalanceListeners) {
        this.runBackground(
          "permissions.rebalance",
          listener(message.control.discordId, message.control.userId),
        );
      }
      return;
    }
    this.deliver(message);
  }

  private deliver(
    message: FederatedRealtimeMessage,
    localBytes?: Uint8Array,
  ): void {
    if (!this.remember(message.id)) return;
    if (!message.frame) return;
    const decoded = tryDecodeRealtimeFrame(
      localBytes ?? fromBase64(message.frame),
    );
    if (decoded._tag === "Failure") {
      this.logger.warn(
        "Rejected malformed Redis federation frame",
        decoded.failure,
      );
      return;
    }
    if (!isServerEventFrame(decoded.success)) return;
    const frame = decoded.success;
    let jsonFrame: string | undefined;
    // Remote frames must be re-encoded after validation strips unknown fields.
    let binaryFrame = localBytes;
    const chatFrames = new Map<string, string | Uint8Array>();

    for (const socket of this.candidates(message)) {
      if (!this.matchesRecipient(socket, message)) continue;
      if (socket.data.apiKeyAccess && frame.type === "map-ping.received") {
        const scopes = message.scopes ?? (message.scope ? [message.scope] : []);
        if (
          !scopes.length ||
          !scopes.every(
            (scope) =>
              scope.organizationId !== undefined &&
              socket.data.apiKeyAccess?.organizationIds.includes(
                scope.organizationId,
              ) &&
              socket.data.guilds.some(
                ({ guild }) => guild.id === scope.organizationId,
              ),
          )
        )
          continue;
      }
      if (!this.matchesPresenceAudience(socket, message)) continue;
      if (!canReadSourceEvent(socket.data, frame, message.sourceNpcs)) continue;
      if (frame.type === "chat.created") {
        this.send(socket, this.encodeChatEvent(socket.data, frame, chatFrames));
        continue;
      }
      const encoded =
        socket.data.frameEncoding === "json"
          ? (jsonFrame ??= JSON.stringify(frame))
          : (binaryFrame ??= encodeRealtimeFrame(frame));
      this.send(socket, encoded);
    }
  }

  private encodeChatEvent(
    session: SessionData,
    event: Extract<Event, { type: "chat.created" }>,
    frames: Map<string, string | Uint8Array>,
  ): string | Uint8Array {
    const permissions = chatMessagePermissions(session, event);
    const key = `${session.frameEncoding}:${permissions.canEdit}:${permissions.canDelete}`;
    let encoded = frames.get(key);
    if (encoded === undefined) {
      const recipientFrame = withChatMessagePermissions(event, permissions);
      encoded =
        session.frameEncoding === "json"
          ? JSON.stringify(recipientFrame)
          : encodeRealtimeFrame(recipientFrame);
      frames.set(key, encoded);
    }
    return encoded;
  }

  private audienceKeys(session: SessionData): string[] {
    return [
      JSON.stringify(["user", session.userId]),
      JSON.stringify(["discord", session.discordId]),
      ...Array.from(session.subscriptions.values(), getScopeAudienceKey),
    ];
  }

  private addAudience(key: string, socket: GatewaySocket): void {
    let audience = this.audiences.get(key);
    if (!audience) {
      audience = new Set();
      this.audiences.set(key, audience);
    }
    audience.add(socket);
  }

  private removeAudience(key: string, socket: GatewaySocket): void {
    const audience = this.audiences.get(key);
    if (!audience) return;
    audience.delete(socket);
    if (audience.size === 0) this.audiences.delete(key);
  }

  private candidates(
    message: FederatedRealtimeMessage,
  ): Iterable<GatewaySocket> {
    const keys: string[] = [];
    if (message.userId !== undefined)
      keys.push(JSON.stringify(["user", message.userId]));
    if (message.discordId !== undefined)
      keys.push(JSON.stringify(["discord", message.discordId]));
    const scopes = message.scope ? [message.scope] : [];
    if (message.scopes) scopes.push(...message.scopes);
    for (const scope of scopes) {
      keys.push(...matchingScopeAudienceKeys(scope));
    }
    const [first, ...others] = keys.flatMap((key) => {
      const audience = this.audiences.get(key);
      return audience ? [audience] : [];
    });
    if (!first) return [];
    if (others.length === 0) return [...first];
    const candidates = new Set(first);
    for (const audience of others) {
      for (const socket of audience) candidates.add(socket);
    }
    return candidates;
  }

  private matchesRecipient(
    socket: GatewaySocket,
    message: FederatedRealtimeMessage,
  ): boolean {
    if (socket.data.connectionId === message.excludeConnectionId) return false;
    if (
      message.recipientPlatform !== undefined &&
      socket.data.platform !== message.recipientPlatform
    )
      return false;
    if (
      message.recipientWorld !== undefined &&
      socket.data.presence?.character?.world !== message.recipientWorld
    )
      return false;
    if (
      message.recipientMapId !== undefined &&
      socket.data.presence?.location?.mapId !== message.recipientMapId
    )
      return false;
    return true;
  }

  private matchesPresenceAudience(
    socket: GatewaySocket,
    message: FederatedRealtimeMessage,
  ): boolean {
    if (!message.presenceAudience || !message.organizationId) return true;
    const precise = canReadPreciseLocation(socket.data, message.organizationId);
    return message.presenceAudience === "precise" ? precise : !precise;
  }

  private remember(id: string): boolean {
    if (this.seenEventIds.has(id)) return false;
    this.seenEventIds.add(id);
    this.seenEventOrder.push(id);
    if (this.seenEventOrder.length > MAX_DEDUPLICATION_ENTRIES) {
      const evicted = this.seenEventOrder.shift();
      if (evicted) this.seenEventIds.delete(evicted);
    }
    return true;
  }

  private sendFrame(socket: GatewaySocket, frame: Response | Event): boolean {
    return this.send(
      socket,
      socket.data.frameEncoding === "json"
        ? JSON.stringify(frame)
        : encodeRealtimeFrame(frame),
    );
  }

  private send(socket: GatewaySocket, data: string | Uint8Array): boolean {
    if (!hasValidApiKeyLease(socket.data)) {
      socket.close(1008, "API key authorization expired");
      return false;
    }
    if (socket.getBufferedAmount() > this.config.maxBackpressureBytes) {
      socket.data.backpressureStrikes += 1;
      if (
        socket.data.backpressureStrikes >= this.config.maxBackpressureStrikes
      ) {
        socket.close(1013, "backpressure limit exceeded");
      }
      return false;
    }
    socket.data.backpressureStrikes = 0;
    socket.send(data, true);
    return true;
  }
}
