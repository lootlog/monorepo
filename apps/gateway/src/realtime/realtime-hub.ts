import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import type {
  Response as RealtimeResponse,
  ServerEvent,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { Logger } from "#src/platform/logger";
import type {
  FederatedRealtimeMessage,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { canReadPreciseLocation } from "#src/realtime/subscription-policy";

type Scope = typeof SubscriptionScope.Type;
type Event = typeof ServerEvent.Type;
type Response = typeof RealtimeResponse.Type;

const MAX_DEDUPLICATION_ENTRIES = 10_000;

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");
const fromBase64 = (value: string): Uint8Array =>
  new Uint8Array(Buffer.from(value, "base64"));

export const getScopeKey = (scope: Scope): string =>
  [
    scope.topic,
    scope.organizationId ?? "",
    scope.eventId ?? "",
    scope.world ?? "",
    scope.mapId?.toString() ?? "",
  ].join("|");

const scopeMatches = (subscription: Scope, published: Scope): boolean => {
  if (subscription.topic !== published.topic) return false;
  for (const field of [
    "organizationId",
    "eventId",
    "world",
    "mapId",
  ] as const) {
    const expected = subscription[field];
    if (expected !== undefined && expected !== published[field]) return false;
  }
  return true;
};

export class RealtimeHub {
  private readonly logger = new Logger(RealtimeHub.name);
  private readonly sockets = new Map<string, GatewaySocket>();
  private readonly seenEventIds = new Set<string>();
  private readonly seenEventOrder: string[] = [];
  private readonly permissionRebalanceListeners = new Set<
    (discordId: string, userId: string) => Promise<void>
  >();
  readonly instanceId = crypto.randomUUID();

  constructor(
    private readonly config: GatewayConfiguration,
    private readonly redis: RedisGatewayStore,
  ) {}

  async start(): Promise<void> {
    await this.redis.subscribe((message) => this.receiveFederated(message));
  }

  register(socket: GatewaySocket): void {
    this.sockets.set(socket.data.connectionId, socket);
    void this.refreshRegistry(socket.data);
  }

  unregister(socket: GatewaySocket): void {
    this.sockets.delete(socket.data.connectionId);
    void Promise.all([
      this.redis.command.del(this.connectionKey(socket.data.connectionId)),
      this.redis.command.srem(
        this.userConnectionsKey(socket.data.userId),
        socket.data.connectionId,
      ),
    ]);
  }

  subscribe(socket: GatewaySocket, scope: Scope): void {
    socket.data.subscriptions.set(getScopeKey(scope), scope);
  }

  unsubscribe(socket: GatewaySocket, scope: Scope): void {
    socket.data.subscriptions.delete(getScopeKey(scope));
  }

  replaceSubscriptions(
    socket: GatewaySocket,
    scopes: ReadonlyArray<Scope>,
  ): void {
    socket.data.subscriptions.clear();
    for (const scope of scopes) this.subscribe(socket, scope);
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
        return [JSON.parse(value)];
      } catch {
        return [];
      }
    });
  }

  sendResponse(socket: GatewaySocket, response: Response): boolean {
    return this.send(socket, encodeRealtimeFrame(response));
  }

  sendEvent(socket: GatewaySocket, event: Event): boolean {
    return this.send(socket, encodeRealtimeFrame(event));
  }

  async publishToScope(scope: Scope, event: Event): Promise<void> {
    const message = this.createFederatedMessage({
      scopeKey: getScopeKey(scope),
      scope,
      frame: event,
    });
    this.deliver(message);
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
    const message = this.createFederatedMessage({
      scopes,
      frame: event,
      ...options,
    });
    this.deliver(message);
    await this.redis.publish(message);
  }

  async publishToUser(userId: string, event: Event): Promise<void> {
    const message = this.createFederatedMessage({ userId, frame: event });
    this.deliver(message);
    await this.redis.publish(message);
  }

  async publishToDiscord(discordId: string, event: Event): Promise<void> {
    const message = this.createFederatedMessage({ discordId, frame: event });
    this.deliver(message);
    await this.redis.publish(message);
  }

  onPermissionRebalance(
    listener: (discordId: string, userId: string) => Promise<void>,
  ): void {
    this.permissionRebalanceListeners.add(listener);
  }

  async publishPermissionRebalance(
    discordId: string,
    userId: string,
  ): Promise<void> {
    await this.redis.publish({
      id: crypto.randomUUID(),
      sourceInstanceId: this.instanceId,
      control: { type: "permissions.rebalance", discordId, userId },
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
    for (const message of messages) {
      this.deliver(message);
      await this.redis.publish(message);
    }
  }

  getLocalSockets(): ReadonlyArray<GatewaySocket> {
    return [...this.sockets.values()];
  }

  getLocalSocketsForUser(userId: string): ReadonlyArray<GatewaySocket> {
    return [...this.sockets.values()].filter(
      (socket) => socket.data.userId === userId,
    );
  }

  private connectionKey(connectionId: string): string {
    return `realtime:connection:${connectionId}`;
  }

  private userConnectionsKey(userId: string): string {
    return `realtime:user:${userId}:connections`;
  }

  private createFederatedMessage(options: {
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
  }): FederatedRealtimeMessage {
    return {
      id: crypto.randomUUID(),
      sourceInstanceId: this.instanceId,
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
      frame: toBase64(encodeRealtimeFrame(options.frame)),
    };
  }

  private receiveFederated(message: FederatedRealtimeMessage): void {
    if (message.sourceInstanceId === this.instanceId) return;
    if (message.control) {
      if (!this.remember(message.id)) return;
      for (const listener of this.permissionRebalanceListeners) {
        void listener(message.control.discordId, message.control.userId);
      }
      return;
    }
    this.deliver(message);
  }

  private deliver(message: FederatedRealtimeMessage): void {
    if (!this.remember(message.id)) return;
    if (!message.frame) return;
    let frame: Event;
    try {
      const decoded = decodeRealtimeFrame(fromBase64(message.frame));
      if (!("type" in decoded)) return;
      frame = decoded as Event;
    } catch (error) {
      this.logger.warn("Rejected malformed Redis federation frame", error);
      return;
    }

    for (const socket of this.sockets.values()) {
      if (!this.matchesRecipient(socket, message)) continue;
      const matchesUser =
        message.userId !== undefined && socket.data.userId === message.userId;
      const matchesDiscord =
        message.discordId !== undefined &&
        socket.data.discordId === message.discordId;
      const matchesScope =
        message.scope !== undefined &&
        [...socket.data.subscriptions.values()].some((subscription) =>
          scopeMatches(subscription, message.scope as Scope),
        );
      const matchesAnyScope =
        message.scopes !== undefined &&
        message.scopes.some((published) =>
          [...socket.data.subscriptions.values()].some((subscription) =>
            scopeMatches(subscription, published),
          ),
        );
      if (!(matchesUser || matchesDiscord || matchesScope || matchesAnyScope))
        continue;
      if (!this.matchesPresenceAudience(socket, message)) continue;
      this.sendEvent(socket, frame);
    }
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

  private send(socket: GatewaySocket, bytes: Uint8Array): boolean {
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
    socket.send(bytes, true);
    return true;
  }
}
