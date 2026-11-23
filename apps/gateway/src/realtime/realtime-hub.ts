import {
  type OperationError,
  promiseOperation,
} from "@lootlog/instrumentation/operation";
import { canReadApiKeyEvent } from "#src/realtime/api-key-event-visibility";
import type { LootVisibilityNpc } from "@lootlog/domain/loot-visibility";
import { prepareChatMessagePermissions } from "#src/realtime/chat-message-envelope";
import {
  eventOrganizationId,
  findEventGuild,
  prepareSourceEventVisibility,
} from "#src/realtime/source-event-visibility";
import {
  encodeRealtimeFrame,
  prepareRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import {
  type Response as RealtimeResponse,
  type ServerEvent,
  isServerEventFrame,
  REALTIME_SERVER_CLOSE_CODES,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { type Cause, Context, Effect, Layer, Result, Schema } from "effect";
import {
  GatewayConfig,
  type GatewayConfiguration,
} from "#src/config/gateway-config";
import {
  Background,
  type BackgroundTaskRunner,
  unmanagedBackgroundTaskRunner,
} from "#src/platform/background-tasks";
import { ContextLogger } from "@lootlog/instrumentation";
import {
  GatewayRedis,
  type FederatedRealtimeMessage,
  type RedisGatewayStore,
} from "#src/platform/redis-store";
import {
  hasValidApiKeyLease,
  type GatewaySocket,
  type SessionData,
} from "#src/realtime/session";
import { canReadPreciseLocation } from "#src/realtime/subscription-policy";
import {
  getScopeKey,
  RealtimeAudiences,
} from "#src/realtime/realtime-audiences";
import {
  canReadOrganization,
  encodeChatEvent,
  isPingEvent,
  matchesPresenceAudience,
  matchesRecipient,
  prepareScopeVisibility,
} from "#src/realtime/realtime-delivery-policy";
import { SubscriptionLimitExceeded } from "#src/realtime/realtime-errors";
import type { PartyGatheringEventSource } from "#src/realtime/npc-event-visibility";
import type { GlobalChatCounts } from "#src/realtime/gateway-metrics";
import {
  decodePublishedFrame,
  encodePublishedFrame,
  FRAME_SCHEMA,
  type PublishedFrame,
} from "#src/realtime/published-frame";
import { closeGradually } from "#src/realtime/close-gradually";
import { RecentIds } from "#src/realtime/recent-ids";

type Scope = SubscriptionScope;

type Event = ServerEvent;

type Response = RealtimeResponse;

const MAX_SUBSCRIPTIONS = 4_096;

const MAX_SCOPE_BYTES = 1_024;

const FEDERATION_GRACE_MS = 15_000;

const FEDERATION_CLOSE_SPREAD_MS = 10_000;

type RealtimeFederationStore = Pick<
  RedisGatewayStore,
  "publish" | "publishOnce" | "subscribe"
>;

export class RealtimeHub {
  private readonly logger = new ContextLogger(RealtimeHub.name);
  private readonly sockets = new Map<string, GatewaySocket>();
  private readonly audiences = new RealtimeAudiences();
  private readonly backpressuredSockets = new WeakSet<GatewaySocket>();
  private readonly deliveredIds = new RecentIds(10_000);
  private readonly permissionRebalanceListeners = new Set<
    (discordId: string, userId: string) => Effect.Effect<void, unknown>
  >();
  private federated = false;
  private federationGrace: ReturnType<typeof setTimeout> | undefined;
  private federationEpoch = 0;
  private draining = false;
  readonly instanceId = crypto.randomUUID();
  globalChatCounts?: GlobalChatCounts;

  constructor(
    private readonly config: Pick<GatewayConfiguration, "maxBackpressureBytes">,
    private readonly redis: RealtimeFederationStore,
    private readonly runBackground: BackgroundTaskRunner = unmanagedBackgroundTaskRunner,
  ) {}

  get start(): Effect.Effect<void, OperationError> {
    return promiseOperation("realtime.federation.subscribe", () =>
      this.redis.subscribe(
        (message) => this.receiveFederated(message),
        (state) => {
          if (state === "subscribed") this.restoreFederation();
          else if (state === "interrupted") this.interruptFederation();
          else this.closeAfterFederationGap();
        },
      ),
    );
  }

  unavailableReason(): "draining" | "federation-unavailable" | undefined {
    if (this.draining) return "draining";

    if (!this.federated) return "federation-unavailable";

    return undefined;
  }

  startDraining(): void {
    this.draining = true;
  }

  register(socket: GatewaySocket): void {
    const previous = this.sockets.get(socket.data.connectionId);

    if (previous) this.audiences.removeSession(previous);

    this.sockets.set(socket.data.connectionId, socket);
    this.audiences.addSession(socket);
    this.setPresence(socket, socket.data.presence);
  }

  detach(socket: GatewaySocket): void {
    if (this.sockets.get(socket.data.connectionId) !== socket) return;
    this.sockets.delete(socket.data.connectionId);
    this.audiences.removeSession(socket);
  }

  setPresence(socket: GatewaySocket, presence: SessionData["presence"]): void {
    socket.data.presence = presence;
    const world = presence?.character?.world;
    const mapId = presence?.location?.mapId;

    this.audiences.setLocation(
      socket,
      this.sockets.get(socket.data.connectionId) === socket &&
        world !== undefined &&
        mapId !== undefined
        ? { world, mapId }
        : undefined,
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
      this.audiences.addScope(scope, socket);
  }

  unsubscribe(socket: GatewaySocket, scope: Scope): void {
    const key = getScopeKey(scope);
    const removed = socket.data.subscriptions.get(key);

    if (!removed) return;
    socket.data.subscriptions.delete(key);
    const audienceKey = getScopeKey(removed);

    for (const subscription of socket.data.subscriptions.values()) {
      if (getScopeKey(subscription) === audienceKey) return;
    }

    this.audiences.removeScope(removed, socket);
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
      for (const scope of socket.data.subscriptions.values())
        this.audiences.removeScope(scope, socket);
      socket.data.subscriptions.clear();
      socket.close(1008, "subscription limit exceeded");
      throw new SubscriptionLimitExceeded();
    }

    for (const scope of socket.data.subscriptions.values())
      this.audiences.removeScope(scope, socket);
    socket.data.subscriptions.clear();

    for (const scope of replacements.values()) this.subscribe(socket, scope);
  }

  sendResponse(socket: GatewaySocket, response: Response): boolean {
    return this.sendFrame(socket, response);
  }

  sendEvent(socket: GatewaySocket, event: Event): boolean {
    if (!canReadApiKeyEvent(socket.data, event)) return false;

    if (isPingEvent(event)) return false;

    if (!canReadOrganization(socket.data, event)) return false;

    return this.sendFrame(socket, event);
  }

  async publishToScope(
    scope: Scope,
    event: Event,
    publicationId?: string,
    options: {
      readonly recipientPlatform?: "web-app";
      readonly sourceNpcs?: ReadonlyArray<LootVisibilityNpc>;
      readonly partyGatheringSource?: PartyGatheringEventSource;
      readonly discordId?: string;
    } = {},
  ): Promise<void> {
    const { message, prepared, frames } = this.createFederatedMessage({
      id: publicationId
        ? JSON.stringify([getScopeKey(scope), event.type, publicationId])
        : undefined,
      ...options,
      scopeKey: getScopeKey(scope),
      scope,
      frame: event,
    });

    if (publicationId) {
      if (await this.redis.publishOnce(message, frames))
        this.deliver(message, prepared);

      return;
    }

    this.deliver(message, prepared);
    await this.redis.publish(message, frames);
  }

  async publishToScopes(
    scopes: ReadonlyArray<Scope>,
    event: Event,
    options: {
      readonly excludeConnectionId?: string;
      readonly recipientPlatform?: "game" | "web-app";
      readonly recipientWorld?: string;
      readonly recipientMapId?: number;
      readonly recipientCharacterIds?: readonly string[];
      readonly organizationId?: string;
      readonly presenceAudience?: "precise";
      readonly localOnly?: boolean;
    } = {},
  ): Promise<void> {
    if (scopes.length === 0) return;
    const { localOnly, ...recipients } = options;

    const { message, prepared, frames } = this.createFederatedMessage({
      scopes,
      frame: event,
      ...recipients,
    });

    this.deliver(message, prepared);

    if (!localOnly) await this.redis.publish(message, frames);
  }

  async publishToUser(userId: string, event: Event): Promise<void> {
    const { message, prepared, frames } = this.createFederatedMessage({
      userId,
      frame: event,
    });

    this.deliver(message, prepared);
    await this.redis.publish(message, frames);
  }

  async publishToDiscord(discordId: string, event: Event): Promise<void> {
    const { message, prepared, frames } = this.createFederatedMessage({
      discordId,
      frame: event,
    });

    this.deliver(message, prepared);
    await this.redis.publish(message, frames);
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
  ): Effect.Effect<void, OperationError | Cause.TimeoutError> {
    return promiseOperation("realtime.federation.publish", () =>
      this.redis.publish({
        id: crypto.randomUUID(),
        sourceInstanceId: this.instanceId,
        control: { type: "permissions.rebalance", discordId, userId },
      }),
    ).pipe(Effect.timeout("10 seconds"));
  }

  async publishPresence(
    scope: Scope,
    basicEvent: Event,
    preciseEvent: Event,
  ): Promise<void> {
    const organizationId = scope.organizationId;

    if (!organizationId) return;

    if (basicEvent === preciseEvent) {
      await this.publishToScope(scope, basicEvent);

      return;
    }

    const scopeKey = getScopeKey(scope);

    const { message, prepared, preparedPrecise, frames } =
      this.createFederatedMessage({
        scopeKey,
        scope,
        organizationId,
        frame: basicEvent,
        preciseFrame: preciseEvent,
      });

    this.deliver(message, prepared, preparedPrecise);
    await this.redis.publish(message, frames);
  }

  getLocalScopes(topic: Scope["topic"]): Scope[] {
    return this.audiences.localScopes(topic);
  }

  getLocalSockets(): ReadonlyArray<GatewaySocket> {
    return [...this.sockets.values()];
  }

  getLocalSocketsForUser(userId: string): ReadonlyArray<GatewaySocket> {
    return this.audiences.socketsForUser(userId);
  }

  reconnectUser(discordId: string, userId: string): void {
    for (const socket of this.getLocalSocketsForUser(userId)) {
      if (socket.data.discordId !== discordId) continue;
      this.detach(socket);
      socket.close(
        REALTIME_SERVER_CLOSE_CODES.tryAgainLater,
        "authorization temporarily unavailable",
      );
    }
  }

  private restoreFederation(): void {
    if (this.federationGrace === undefined) {
      this.markFederated();

      return;
    }

    clearTimeout(this.federationGrace);
    this.federationGrace = undefined;
    this.markFederated();
  }

  private markFederated(): void {
    if (this.federated) return;
    this.federated = true;
    this.logger.info("Realtime federation subscribed", {
      instanceId: this.instanceId,
    });
  }

  private interruptFederation(): void {
    this.federationEpoch++;

    if (!this.federated) return;
    this.federated = false;

    this.logger.warn("Realtime federation subscription interrupted", {
      instanceId: this.instanceId,
      sockets: this.sockets.size,
    });
    this.federationGrace = setTimeout(
      () => this.closeAfterFederationGap(),
      FEDERATION_GRACE_MS,
    );
    this.federationGrace.unref?.();
  }

  private closeAfterFederationGap(): void {
    this.federationEpoch++;
    clearTimeout(this.federationGrace);
    this.federationGrace = undefined;
    const sockets = this.getLocalSockets();

    this.logger.error(
      "Realtime federation may have lost frames; closing local sockets",
      {
        instanceId: this.instanceId,
        sockets: sockets.length,
      },
    );

    for (const socket of sockets) {
      socket.data.closing = true;
      this.detach(socket);
    }

    this.runBackground(
      "realtime.federation.close",
      closeGradually(sockets, FEDERATION_CLOSE_SPREAD_MS, (socket) =>
        socket.close(
          REALTIME_SERVER_CLOSE_CODES.tryAgainLater,
          "realtime federation unavailable",
        ),
      ),
    );
  }

  private createFederatedMessage(options: {
    readonly sourceNpcs?: ReadonlyArray<LootVisibilityNpc>;
    readonly partyGatheringSource?: PartyGatheringEventSource;
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
    readonly recipientCharacterIds?: readonly string[];
    readonly organizationId?: string;
    readonly presenceAudience?: "precise";
    readonly frame: Event;
    readonly preciseFrame?: Event;
  }) {
    const prepared = prepareRealtimeFrame(options.frame);

    const preparedPrecise =
      options.preciseFrame && prepareRealtimeFrame(options.preciseFrame);

    return {
      prepared,
      preparedPrecise,
      message: {
        id: options.id ?? crypto.randomUUID(),
        sourceInstanceId: this.instanceId,
        sourceNpcs: options.sourceNpcs,
        partyGatheringSource: options.partyGatheringSource,
        scopeKey: options.scopeKey,
        scope: options.scope,
        scopes: options.scopes,
        userId: options.userId,
        discordId: options.discordId,
        excludeConnectionId: options.excludeConnectionId,
        recipientPlatform: options.recipientPlatform,
        recipientWorld: options.recipientWorld,
        recipientMapId: options.recipientMapId,
        recipientCharacterIds: options.recipientCharacterIds,
        organizationId: options.organizationId,
        presenceAudience: options.presenceAudience,
        frameSchema: FRAME_SCHEMA,
      },
      frames: { event: prepared.text, preciseEvent: preparedPrecise?.text },
    };
  }

  private receiveFederated(message: FederatedRealtimeMessage): void {
    if (message.sourceInstanceId === this.instanceId) return;

    if (message.control) {
      if (!this.deliveredIds.add(message.id)) return;

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

  private publicationFrame(
    value: Schema.Json | undefined,
    frameSchema: string | undefined,
    local?: ReturnType<typeof prepareRealtimeFrame>,
  ): PublishedFrame | undefined {
    const decoded = decodePublishedFrame(value, frameSchema, local);

    if (decoded === undefined) return;

    if (Result.isFailure(decoded)) {
      this.logger.warn(
        "Rejected malformed Redis federation frame",
        decoded.failure,
      );

      return;
    }

    if (!isServerEventFrame(decoded.success)) return;

    return { event: decoded.success, text: local?.text };
  }

  private deliver(
    message: FederatedRealtimeMessage,
    local?: ReturnType<typeof prepareRealtimeFrame>,
    localPrecise?: ReturnType<typeof prepareRealtimeFrame>,
  ): void {
    if (!this.deliveredIds.add(message.id)) return;
    const candidates = this.audiences.candidates(message);

    if (candidates.size === 0) return;

    const published = this.publicationFrame(
      message.event,
      message.frameSchema,
      local,
    );

    if (!published) return;
    const frame = published.event;

    const precise = this.preciseFrame(message, localPrecise);

    if (precise === null) return;
    const chatFrames = new Map<boolean, string>();

    const canReadSource = prepareSourceEventVisibility(
      frame,
      message.sourceNpcs,
      message.partyGatheringSource,
    );

    const organizationId = eventOrganizationId(frame);

    const canReadScope = prepareScopeVisibility(this.audiences, message, frame);

    const chatPermissions =
      frame.type === "chat.created"
        ? prepareChatMessagePermissions(frame)
        : undefined;

    for (const socket of candidates) {
      if (!matchesRecipient(socket, message)) continue;

      if (!canReadScope(socket)) continue;

      if (!matchesPresenceAudience(socket, message)) continue;

      const guild = findEventGuild(socket.data, organizationId);

      if (!canReadOrganization(socket.data, frame, guild)) continue;

      if (!canReadSource(socket.data, guild)) continue;

      if (frame.type === "chat.created" && chatPermissions) {
        this.send(
          socket,
          encodeChatEvent(
            frame,
            chatFrames,
            chatPermissions(socket.data, guild),
          ),
        );
        continue;
      }

      const variant =
        precise && canReadPreciseLocation(socket.data, precise.organizationId)
          ? precise.published
          : published;

      this.send(socket, encodePublishedFrame(variant));
    }
  }

  private preciseFrame(
    message: FederatedRealtimeMessage,
    local?: ReturnType<typeof prepareRealtimeFrame>,
  ) {
    if (
      (local === undefined && message.preciseEvent === undefined) ||
      !message.organizationId
    )
      return;

    const published = this.publicationFrame(
      message.preciseEvent,
      message.frameSchema,
      local,
    );

    return published
      ? { organizationId: message.organizationId, published }
      : null;
  }

  private sendFrame(socket: GatewaySocket, frame: Response | Event): boolean {
    return this.send(socket, encodeRealtimeFrame(frame));
  }

  private send(socket: GatewaySocket, data: string): boolean {
    if (this.backpressuredSockets.has(socket)) return false;

    if (!hasValidApiKeyLease(socket.data)) {
      socket.close(1008, "API key authorization expired");

      return false;
    }

    if (
      socket.getBufferedAmount() > this.config.maxBackpressureBytes ||
      socket.send(data, true) === 0
    ) {
      this.backpressuredSockets.add(socket);
      socket.close(
        REALTIME_SERVER_CLOSE_CODES.tryAgainLater,
        "backpressure limit exceeded",
      );

      return false;
    }

    return true;
  }
}

export class Hub extends Context.Service<Hub, RealtimeHub>()(
  "@lootlog/gateway/realtime/Hub",
) {
  static readonly layer = Layer.effect(
    Hub,
    Effect.gen(function* () {
      const hub = new RealtimeHub(
        yield* GatewayConfig,
        yield* GatewayRedis,
        (yield* Background).run,
      );

      yield* hub.start;

      return hub;
    }),
  );
}
