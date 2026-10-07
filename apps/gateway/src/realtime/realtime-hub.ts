import { canReadApiKeyEvent } from "#src/realtime/api-key-event-visibility";
import type { LootVisibilityNpc } from "@lootlog/domain/loot-visibility";
import {
  prepareChatMessagePermissions,
  withChatMessagePermissions,
} from "#src/realtime/chat-message-envelope";
import {
  eventOrganizationId,
  findEventGuild,
  prepareSourceEventVisibility,
} from "#src/realtime/source-event-visibility";
import {
  encodeRealtimeFrame,
  prepareRealtimeFrame,
  tryDecodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import {
  type Response as RealtimeResponse,
  type ServerEvent,
  isServerEventFrame,
  type SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Effect, Result } from "effect";
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
import {
  canReadPreciseLocation,
  canSubscribe,
} from "#src/realtime/subscription-policy";
import { SubscriptionLimitExceeded } from "#src/realtime/realtime-errors";
import {
  isReadyRoomRemoval,
  type PartyGatheringEventSource,
} from "#src/realtime/npc-event-visibility";
import { toLegacyAirTagUpdates } from "#src/realtime/air-tag-legacy-updates";
import type { GlobalChatCounts } from "#src/realtime/gateway-metrics";

type Scope = typeof SubscriptionScope.Type;

type Event = typeof ServerEvent.Type;

type Response = typeof RealtimeResponse.Type;

// ponytail: replay deduplication covers 10,000 events per live instance; use a durable inbox if retries must survive eviction or restarts.
const MAX_DEDUPLICATION_ENTRIES = 10_000;

const MAX_SUBSCRIPTIONS = 4_096;

const MAX_SCOPE_BYTES = 1_024;

/**
 * Federated frame types this replica decodes and federation guarantees it
 * provides. Bump it with a new federated event type and publish that type only
 * once `clusterFederationVersion` reaches it: a replica drops a frame its
 * schema does not know.
 */
export const FEDERATION_VERSION = 7;

export const PARTY_GATHERING_STATE_FEDERATION_VERSION = 3;

/** Every replica numbers its publications, so a subscriber can prove it lost none. */
export const SEQUENCED_FEDERATION_VERSION = 4;

/** Replicas from this version register the air-tag scopes their sockets follow. */
export const AIR_TAG_INTEREST_FEDERATION_VERSION = 5;

/** Replicas from this version decode `global-chat.created`. */
export const GLOBAL_CHAT_FEDERATION_VERSION = 6;

/** Replicas from this version decode `global-chat.deleted` and `global-chat.pinned`. */
export const GLOBAL_CHAT_CHANNELS_FEDERATION_VERSION = 7;

const CLOSE_BATCH_INTERVAL_MS = 100;

/** Closes sockets in batches so their reconnects reach the other replicas and the API gradually. */
export const closeGradually = (
  sockets: ReadonlyArray<GatewaySocket>,
  spreadMs: number,
  close: (socket: GatewaySocket) => void,
) =>
  Effect.gen(function* () {
    const batchSize = Math.max(
      1,
      Math.ceil(
        sockets.length / Math.max(1, spreadMs / CLOSE_BATCH_INTERVAL_MS),
      ),
    );

    for (let index = 0; index < sockets.length; index += batchSize) {
      if (index > 0) yield* Effect.sleep(CLOSE_BATCH_INTERVAL_MS);

      for (const socket of sockets.slice(index, index + batchSize))
        close(socket);
    }
  });

interface FederationRecovery {
  /** How long sessions wait for a dropped subscription to prove it lost nothing. */
  readonly graceMs?: number;
  /** Spreads the closes when sessions did miss frames. */
  readonly closeSpreadMs?: number;
  /**
   * Reads the lowest `FEDERATION_VERSION` of the live replicas when a
   * resubscription vouches for sessions. The periodic sample can predate a
   * replica that started, or rolled back, during the gap.
   */
  readonly readClusterFederationVersion?: () => Effect.Effect<number, unknown>;
}

// Covers a 5 s Dragonfly stall plus the resubscribe backoff and reorder window.
const FEDERATION_GRACE_MS = 15_000;

const FEDERATION_CLOSE_SPREAD_MS = 10_000;

const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");

const fromBase64 = (value: string): Uint8Array => Buffer.from(value, "base64");

/** The global chat channel of `world`, or the one every world shares. */
export const globalChatScope = (world: string | undefined): Scope =>
  world === undefined
    ? { topic: "global.chat" }
    : { topic: "global.chat.world", world };

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

const getLocationAudienceKey = (
  platform: SessionData["platform"],
  world: string,
  mapId: number,
): string => JSON.stringify(["recipient-location", platform, world, mapId]);

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

type RealtimeFederationStore = Pick<RedisGatewayStore, "publish" | "subscribe">;

// Pings carry no Organization, so they reach sockets only through authorized routing scopes.
const isPingEvent = (
  event: Event,
): event is Extract<
  Event,
  { type: "map-ping.received" | "battle-ping.received" }
> =>
  event.type === "map-ping.received" || event.type === "battle-ping.received";

export class RealtimeHub {
  private readonly logger = new Logger(RealtimeHub.name);
  private readonly sockets = new Map<string, GatewaySocket>();
  private readonly audiences = new Map<string, Set<GatewaySocket>>();
  private readonly locationKeys = new WeakMap<GatewaySocket, string>();
  private readonly backpressuredSockets = new WeakSet<GatewaySocket>();
  private readonly seenEventIds = new Set<string>();
  private readonly seenEventOrder: string[] = [];
  private readonly permissionRebalanceListeners = new Set<
    (discordId: string, userId: string) => Effect.Effect<void, unknown>
  >();
  private federated = false;
  private federationGrace: ReturnType<typeof setTimeout> | undefined;
  /** Discards a continuity check that a later interruption or gap overtook. */
  private federationEpoch = 0;
  private draining = false;
  readonly instanceId = crypto.randomUUID();
  /** Lowest `FEDERATION_VERSION` among live replicas, kept by `GatewayMetrics`; 1 until known. */
  clusterFederationVersion = 1;
  /** Cluster-wide global chat counts, kept by `GatewayMetrics`; undefined until sampled. */
  globalChatCounts?: GlobalChatCounts;

  constructor(
    private readonly config: Pick<GatewayConfiguration, "maxBackpressureBytes">,
    private readonly redis: RealtimeFederationStore,
    private readonly runBackground: BackgroundTaskRunner = unmanagedBackgroundTaskRunner,
    private readonly federationRecovery: FederationRecovery = {},
  ) {}

  start(): Effect.Effect<void, unknown> {
    return Effect.tryPromise({
      try: () =>
        this.redis.subscribe(
          (message) => this.receiveFederated(message),
          (state) => {
            if (state === "subscribed") this.restoreFederation();
            else if (state === "interrupted") this.interruptFederation();
            else this.closeAfterFederationGap();
          },
        ),
      catch: (cause) => cause,
    });
  }

  /** Why this instance must not accept WebSocket sessions, if it must not. */
  unavailableReason(): "draining" | "federation-unavailable" | undefined {
    if (this.draining) return "draining";

    if (!this.federated) return "federation-unavailable";

    return undefined;
  }

  /** Stops admitting sessions; established sockets keep receiving events. */
  startDraining(): void {
    this.draining = true;
  }

  register(socket: GatewaySocket): void {
    const previous = this.sockets.get(socket.data.connectionId);

    if (previous) {
      for (const key of this.audienceKeys(previous.data))
        this.removeAudience(key, previous);
      this.removeLocationAudience(previous);
    }

    this.sockets.set(socket.data.connectionId, socket);

    for (const key of this.audienceKeys(socket.data))
      this.addAudience(key, socket);
    this.setPresence(socket, socket.data.presence);
  }

  detach(socket: GatewaySocket): void {
    if (this.sockets.get(socket.data.connectionId) !== socket) return;
    this.sockets.delete(socket.data.connectionId);

    for (const key of this.audienceKeys(socket.data))
      this.removeAudience(key, socket);
    this.removeLocationAudience(socket);
  }

  setPresence(socket: GatewaySocket, presence: SessionData["presence"]): void {
    socket.data.presence = presence;
    const world = presence?.character?.world;
    const mapId = presence?.location?.mapId;

    const nextKey =
      this.sockets.get(socket.data.connectionId) === socket &&
      world !== undefined &&
      mapId !== undefined
        ? getLocationAudienceKey(socket.data.platform, world, mapId)
        : undefined;

    if (this.locationKeys.get(socket) === nextKey) return;
    this.removeLocationAudience(socket);

    if (nextKey !== undefined) {
      this.addAudience(nextKey, socket);
      this.locationKeys.set(socket, nextKey);
    }
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

  sendResponse(socket: GatewaySocket, response: Response): boolean {
    return this.sendFrame(socket, response);
  }

  sendEvent(socket: GatewaySocket, event: Event): boolean {
    if (!canReadApiKeyEvent(socket.data, event)) return false;

    if (isPingEvent(event)) return false;

    if (!this.canReadOrganization(socket.data, event)) return false;

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
    const { message, prepared } = this.createFederatedMessage({
      id: publicationId
        ? JSON.stringify([getScopeKey(scope), event.type, publicationId])
        : undefined,
      ...options,
      scopeKey: getScopeKey(scope),
      scope,
      frame: event,
    });

    this.deliver(message, prepared);
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
      readonly recipientCharacterIds?: readonly string[];
      /** Limits delivery to readers of this Organization's precise presence location. */
      readonly organizationId?: string;
      readonly presenceAudience?: "precise";
      /** Skips Redis when the caller knows no other replica has a recipient. */
      readonly localOnly?: boolean;
    } = {},
  ): Promise<void> {
    if (scopes.length === 0) return;
    const { localOnly, ...recipients } = options;

    const { message, prepared } = this.createFederatedMessage({
      scopes,
      frame: event,
      ...recipients,
    });

    this.deliver(message, prepared);

    if (!localOnly) await this.redis.publish(message);
  }

  async publishToUser(userId: string, event: Event): Promise<void> {
    const { message, prepared } = this.createFederatedMessage({
      userId,
      frame: event,
    });

    this.deliver(message, prepared);
    await this.redis.publish(message);
  }

  async publishToDiscord(discordId: string, event: Event): Promise<void> {
    const { message, prepared } = this.createFederatedMessage({
      discordId,
      frame: event,
    });

    this.deliver(message, prepared);
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
    }).pipe(Effect.timeout("10 seconds"));
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

    await Promise.all(
      messages.map(async ({ message, prepared }) => {
        this.deliver(message, prepared);
        await this.redis.publish(message);
      }),
    );
  }

  /** Distinct scopes of `topic` that a local socket subscribes to. */
  getLocalScopes(topic: Scope["topic"]): Scope[] {
    const prefix = JSON.stringify([topic]).slice(0, -1);
    const scopes: Scope[] = [];

    for (const key of this.audiences.keys()) {
      if (!key.startsWith(`${prefix},`)) continue;

      // SAFETY: keys with this topic prefix come only from getScopeAudienceKey.
      const [, organizationId, eventId, world, mapId] = JSON.parse(key) as [
        string,
        string | null,
        string | null,
        string | null,
        number | null,
      ];

      scopes.push({
        topic,
        ...(organizationId !== null && { organizationId }),
        ...(eventId !== null && { eventId }),
        ...(world !== null && { world }),
        ...(mapId !== null && { mapId }),
      });
    }

    return scopes;
  }

  getLocalSockets(): ReadonlyArray<GatewaySocket> {
    return [...this.sockets.values()];
  }

  getLocalSocketsForUser(userId: string): ReadonlyArray<GatewaySocket> {
    return [...(this.audiences.get(JSON.stringify(["user", userId])) ?? [])];
  }

  reconnectUser(discordId: string, userId: string): void {
    for (const socket of this.getLocalSocketsForUser(userId)) {
      if (socket.data.discordId !== discordId) continue;
      this.detach(socket);
      socket.close(1013, "authorization temporarily unavailable");
    }
  }

  private restoreFederation(): void {
    if (this.federationGrace === undefined) {
      this.markFederated();

      return;
    }

    // Sequence continuity covers only sequenced frames. Trust it only when
    // every live replica numbers its frames, read now rather than sampled.
    const epoch = this.federationEpoch;

    const read =
      this.federationRecovery.readClusterFederationVersion?.() ??
      Effect.succeed(this.clusterFederationVersion);

    this.runBackground(
      "realtime.federation.verify",
      read.pipe(
        Effect.orElseSucceed(() => 1),
        Effect.map((version) => {
          if (epoch !== this.federationEpoch) return;
          this.clusterFederationVersion = version;

          if (version < SEQUENCED_FEDERATION_VERSION)
            this.closeAfterFederationGap();
          clearTimeout(this.federationGrace);
          this.federationGrace = undefined;
          this.markFederated();
        }),
      ),
    );
  }

  private markFederated(): void {
    if (this.federated) return;
    this.federated = true;
    this.logger.info("Realtime federation subscribed", {
      instanceId: this.instanceId,
    });
  }

  // Readiness is withdrawn at once, so no new session joins during the gap.
  // Established sessions wait for the resubscription to prove it lost no frame.
  private interruptFederation(): void {
    this.federationEpoch++;

    if (!this.federated) return;
    this.federated = false;

    // A replica that does not number its frames can lose them unnoticed.
    if (this.clusterFederationVersion < SEQUENCED_FEDERATION_VERSION) {
      this.closeAfterFederationGap();

      return;
    }

    this.logger.warn("Realtime federation subscription interrupted", {
      instanceId: this.instanceId,
      sockets: this.sockets.size,
    });
    this.federationGrace = setTimeout(
      () => this.closeAfterFederationGap(),
      this.federationRecovery.graceMs ?? FEDERATION_GRACE_MS,
    );
    this.federationGrace.unref?.();
  }

  // Frames lost in the gap may include permission rebalances. Rejoining
  // re-reads Organization access and lets clients refetch current state.
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

    // A session must neither receive frames nor act on authority that a lost
    // frame may have revoked while it waits for its close.
    for (const socket of sockets) {
      socket.data.closing = true;
      this.detach(socket);
    }

    this.runBackground(
      "realtime.federation.close",
      closeGradually(
        sockets,
        this.federationRecovery.closeSpreadMs ?? FEDERATION_CLOSE_SPREAD_MS,
        (socket) => socket.close(1013, "realtime federation unavailable"),
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
    readonly presenceAudience?: "basic" | "precise";
    readonly frame: Event;
  }) {
    const prepared = prepareRealtimeFrame(options.frame);

    return {
      prepared,
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
        frame: toBase64(prepared.bytes),
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

  private publicationFrame(
    message: FederatedRealtimeMessage,
    local?: ReturnType<typeof prepareRealtimeFrame>,
  ): Event | undefined {
    if (!message.frame) return;

    const decoded = local?.frame
      ? Result.succeed(local.frame)
      : tryDecodeRealtimeFrame(local?.bytes ?? fromBase64(message.frame));

    if (Result.isFailure(decoded)) {
      this.logger.warn(
        "Rejected malformed Redis federation frame",
        decoded.failure,
      );

      return;
    }

    if (!isServerEventFrame(decoded.success)) return;

    return decoded.success;
  }

  private deliver(
    message: FederatedRealtimeMessage,
    local?: ReturnType<typeof prepareRealtimeFrame>,
  ): void {
    if (!this.remember(message.id)) return;
    const candidates = this.candidates(message);

    if (candidates.size === 0) return;
    const frame = this.publicationFrame(message, local);

    if (!frame) return;
    let jsonFrame: string | undefined;
    // Remote frames must be re-encoded after validation strips unknown fields.
    let binaryFrame = local?.bytes;
    const chatFrames = new Map<string, string | Uint8Array>();

    const legacyAirTagFrames = new Map<
      string,
      ReadonlyArray<string | Uint8Array>
    >();

    const canReadSource = prepareSourceEventVisibility(
      frame,
      message.sourceNpcs,
      message.partyGatheringSource,
    );

    const organizationId = eventOrganizationId(frame);

    const canReadScope = this.prepareScopeVisibility(message, frame);

    const chatPermissions =
      frame.type === "chat.created"
        ? prepareChatMessagePermissions(frame)
        : undefined;

    for (const socket of candidates) {
      if (!this.matchesRecipient(socket, message)) continue;

      if (!canReadScope(socket)) continue;

      if (!this.matchesPresenceAudience(socket, message)) continue;

      const guild = findEventGuild(socket.data, organizationId);

      if (!this.canReadOrganization(socket.data, frame, guild)) continue;

      if (!canReadSource(socket.data, guild)) continue;

      if (frame.type === "chat.created" && chatPermissions) {
        this.send(
          socket,
          this.encodeChatEvent(
            socket.data,
            frame,
            chatFrames,
            chatPermissions(socket.data, guild),
          ),
        );
        continue;
      }

      if (
        frame.type === "air-tag.scope-updated" &&
        !socket.data.supportsAirTagScopeUpdates
      ) {
        this.sendEach(
          socket,
          this.encodeLegacyAirTagUpdates(
            socket.data,
            frame,
            legacyAirTagFrames,
          ),
        );
        continue;
      }

      const encoded =
        socket.data.frameEncoding === "json"
          ? (jsonFrame ??= JSON.stringify(frame))
          : (binaryFrame ??= encodeRealtimeFrame(frame));

      this.send(socket, encoded);
    }
  }

  private canReadOrganization(
    session: SessionData,
    event: Event,
    guild = findEventGuild(session, eventOrganizationId(event)),
  ): boolean {
    if (isReadyRoomRemoval(event)) return true;

    if (event.type === "reservation.changed")
      return event.data.audienceGuildIds.some((organizationId) =>
        session.guilds.some((entry) => entry.guild.id === organizationId),
      );

    return eventOrganizationId(event) === undefined || guild !== undefined;
  }

  private prepareScopeVisibility(
    message: FederatedRealtimeMessage,
    frame: Event,
  ): (socket: GatewaySocket) => boolean {
    const scopes = message.scopes ?? (message.scope ? [message.scope] : []);

    // A ping carries no Organization in its payload, so only routing scopes can authorize it.
    if (isPingEvent(frame) && scopes.length === 0) return () => false;
    const organizationId = eventOrganizationId(frame);

    const scopeAudiences = scopes.map((scope) => ({
      scope: {
        ...scope,
        organizationId: scope.organizationId ?? organizationId,
      },
      audiences: matchingScopeAudienceKeys(scope).flatMap((key) => {
        const audience = this.audiences.get(key);

        return audience ? [audience] : [];
      }),
    }));

    return (socket) => {
      const isGatheringOrganizer =
        frame.type === "party-gathering.state-updated" &&
        message.discordId === socket.data.discordId &&
        message.partyGatheringSource?.organizerDiscordId ===
          socket.data.discordId;

      if (
        scopeAudiences.length > 0 &&
        !isGatheringOrganizer &&
        !scopeAudiences.some(
          ({ scope, audiences }) =>
            canSubscribe(socket.data, scope) &&
            audiences.some((audience) => audience.has(socket)),
        )
      )
        return false;

      if (socket.data.apiKeyAccess && isPingEvent(frame))
        return scopes.every(
          (scope) =>
            scope.organizationId !== undefined &&
            socket.data.apiKeyAccess?.organizationIds.includes(
              scope.organizationId,
            ) &&
            socket.data.guilds.some(
              ({ guild }) => guild.id === scope.organizationId,
            ),
        );

      return true;
    };
  }

  private encodeChatEvent(
    session: SessionData,
    event: Extract<Event, { type: "chat.created" }>,
    frames: Map<string, string | Uint8Array>,
    permissions: { canDelete: boolean },
  ): string | Uint8Array {
    const key = `${session.frameEncoding}:${permissions.canDelete}`;
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

  private encodeLegacyAirTagUpdates(
    session: SessionData,
    event: Extract<Event, { type: "air-tag.scope-updated" }>,
    frames: Map<string, ReadonlyArray<string | Uint8Array>>,
  ): ReadonlyArray<string | Uint8Array> {
    const key = session.frameEncoding ?? "messagepack";
    let encoded = frames.get(key);

    if (encoded === undefined) {
      encoded = toLegacyAirTagUpdates(event).map((legacy) =>
        session.frameEncoding === "json"
          ? JSON.stringify(legacy)
          : encodeRealtimeFrame(legacy),
      );
      frames.set(key, encoded);
    }

    return encoded;
  }

  private sendEach(
    socket: GatewaySocket,
    frames: ReadonlyArray<string | Uint8Array>,
  ): void {
    for (const frame of frames) {
      if (!this.send(socket, frame)) return;
    }
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

  private removeLocationAudience(socket: GatewaySocket): void {
    const key = this.locationKeys.get(socket);

    if (key === undefined) return;
    this.removeAudience(key, socket);
    this.locationKeys.delete(socket);
  }

  private candidates(
    message: FederatedRealtimeMessage,
  ): ReadonlySet<GatewaySocket> {
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

    const audiences = keys.flatMap((key) => {
      const audience = this.audiences.get(key);

      return audience ? [audience] : [];
    });

    if (
      message.recipientPlatform !== undefined &&
      message.recipientWorld !== undefined &&
      message.recipientMapId !== undefined
    ) {
      const location = this.audiences.get(
        getLocationAudienceKey(
          message.recipientPlatform,
          message.recipientWorld,
          message.recipientMapId,
        ),
      );

      const candidates = new Set<GatewaySocket>();

      if (!location) return candidates;

      const audienceSize = audiences.reduce(
        (size, audience) => size + audience.size,
        0,
      );

      if (location.size < audienceSize) {
        for (const socket of location) {
          if (audiences.some((audience) => audience.has(socket)))
            candidates.add(socket);
        }
      } else {
        for (const audience of audiences) {
          for (const socket of audience) {
            if (location.has(socket)) candidates.add(socket);
          }
        }
      }

      return candidates;
    }

    const [first, ...others] = audiences;

    if (!first) return new Set();

    if (others.length === 0) return first;
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

    if (message.recipientCharacterIds !== undefined) {
      const characterId = socket.data.presence?.character?.characterId;

      if (!characterId || !message.recipientCharacterIds.includes(characterId))
        return false;
    }

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
      socket.close(1013, "backpressure limit exceeded");

      return false;
    }

    return true;
  }
}
